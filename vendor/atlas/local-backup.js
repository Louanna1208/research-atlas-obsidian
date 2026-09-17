import { STORAGE_KEY, validateWorkspace } from './model.js';

/** Optional second copy. Browser workspace storage remains the source of truth.
 * connectBackup and resumeBackup must be called directly from a user action.
 * No function imports file contents into the workspace.
 */
const DATABASE = 'research-atlas.local-backup.v1';
const STORE = 'settings';
const KEY = 'connection';
const MANUAL_COPY = 'Download a JSON backup to keep a separate copy.';
const PERMISSION_MESSAGE = `File backup is paused. Click Resume to allow access. ${MANUAL_COPY}`;
const CONFLICT_MESSAGE = `The connected file changed outside this page. It was not overwritten. Download your browser copy, then explicitly connect a new backup file.`;
const textError = error => error?.message || String(error || 'Unknown error');

function indexedDBStore(provider) {
  async function transaction(mode, operation) {
    if (!provider) throw new Error('IndexedDB is unavailable in this browser.');
    const database = await new Promise((resolve, reject) => {
      let abandoned = false;
      const request = provider.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onblocked = () => { abandoned = true; reject(new Error('Backup settings are blocked by another open tab.')); };
      request.onerror = () => reject(request.error || new Error('Could not open backup settings.'));
      request.onsuccess = () => { if (abandoned) request.result.close(); else resolve(request.result); };
    });
    return new Promise((resolve, reject) => {
      let value;
      try {
        const tx = database.transaction(STORE, mode);
        tx.oncomplete = () => { database.close(); resolve(value); };
        tx.onabort = tx.onerror = () => { database.close(); reject(tx.error || new Error('Could not save backup settings.')); };
        const request = operation(tx.objectStore(STORE));
        request.onsuccess = () => { value = request.result; };
      } catch (error) { database.close(); reject(error); }
    });
  }
  return {
    get: () => transaction('readonly', store => store.get(KEY)),
    set: value => transaction('readwrite', store => store.put(value, KEY)),
    clear: () => transaction('readwrite', store => store.delete(KEY)),
  };
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}

async function sha256(bytes) {
  if (!globalThis.crypto?.subtle) throw new Error('Secure file verification is unavailable.');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Adapters expose real I/O boundaries for tests, without replacing queue behavior.
 * store: { get(), set(record), clear() }; pickFile(options); isEligible(workspace);
 * digest(bytes); now(); storage (StorageManager); supported (boolean).
 */
export function createBackupController(adapters = {}) {
  const pickFile = adapters.pickFile ?? (globalThis.showSaveFilePicker ? options => globalThis.showSaveFilePicker(options) : null);
  const supported = adapters.supported ?? typeof pickFile === 'function';
  let browserDatabase;
  try { browserDatabase = globalThis.indexedDB; } catch { /* Opaque or blocked origins may throw even on access. */ }
  const store = adapters.store ?? indexedDBStore(browserDatabase);
  const digest = adapters.digest ?? sha256;
  const now = adapters.now ?? (() => new Date().toISOString());
  const storage = adapters.storage ?? globalThis.navigator?.storage;
  const isEligible = adapters.isEligible ?? (workspace => {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return false;
    return JSON.stringify(canonical(validateWorkspace(JSON.parse(raw)))) === JSON.stringify(canonical(workspace));
  });
  let state = { supported, linked: false, name: '', permission: 'unknown', lastSaved: null, error: '' };
  let record = null, loadPromise = null, loaded = false, settingsAvailable = false;
  let listener = null, tail = Promise.resolve(), drain = null, pending = null;
  let generation = 0, controls = 0;
  const snapshot = () => ({ ...state });
  function publish(changes = {}) {
    state = { ...state, ...changes };
    try { listener?.(snapshot()); } catch { /* UI callbacks must not break backup writes. */ }
    return snapshot();
  }
  function error(message) { return publish({ error: message }); }
  function serial(operation) {
    const result = tail.then(operation, operation);
    tail = result.catch(() => {});
    return result;
  }
  async function queryPermission(handle) {
    if (typeof handle?.queryPermission !== 'function') return 'denied';
    return handle.queryPermission({ mode: 'readwrite' });
  }
  async function initialize() {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      if (!supported) { loaded = true; return snapshot(); }
      try {
        const saved = await store.get();
        settingsAvailable = true;
        if (saved) {
          if (saved.version !== 1 || !saved.handle || typeof saved.signature !== 'string') {
            throw new Error('The saved file connection could not be verified. Connect a backup file again.');
          }
          record = saved;
          const permission = await queryPermission(record.handle);
          publish({ linked: true, name: record.handle.name || 'Backup file', permission, lastSaved: record.lastSaved || null, error: permission === 'granted' ? '' : PERMISSION_MESSAGE });
        }
      } catch (failure) {
        error(`Could not load the file backup connection. ${textError(failure)} ${MANUAL_COPY}`);
      }
      loaded = true;
      return snapshot();
    })();
    return loadPromise;
  }
  function prepare(workspace) {
    const data = validateWorkspace(workspace);
    if (!isEligible(data)) throw new Error('Only the current workspace successfully saved in this browser can be backed up. Example or unsaved changes cannot be written to the connected file.');
    const content = `${JSON.stringify(data, null, 2)}\n`;
    if (content.length > 25_000_000) throw new Error(`The workspace exceeds the backup size limit. ${MANUAL_COPY}`);
    return { data, content };
  }
  async function inspect(handle) {
    const file = await handle.getFile();
    const hash = await digest(await file.arrayBuffer());
    return { hash, signature: `${file.lastModified}:${file.size}:${hash}` };
  }
  function ensureCurrent(epoch, active) {
    if (epoch !== generation || active !== record) throw new Error('The file backup connection changed before the write completed.');
  }
  async function write(item) {
    const active = record, epoch = generation;
    if (!active) return snapshot();
    let writable = null;
    try {
      // Re-check the browser copy after waiting in the queue. A newer pending
      // snapshot may supersede this one; an obsolete snapshot is never retried.
      if (!isEligible(item.data)) return snapshot();
      const permission = await queryPermission(active.handle);
      ensureCurrent(epoch, active);
      publish({ permission });
      if (permission !== 'granted') return error(PERMISSION_MESSAGE);
      const before = await inspect(active.handle);
      ensureCurrent(epoch, active);
      if (before.signature !== active.signature) return error(CONFLICT_MESSAGE);
      const expectedHash = await digest(new TextEncoder().encode(item.content));
      // An exclusive stream also avoids concurrent API writers in browsers
      // supporting the option. The signature checks remain necessary.
      writable = await active.handle.createWritable({ keepExistingData: false, mode: 'exclusive' });
      ensureCurrent(epoch, active);
      await writable.write(item.content);
      const beforeCommit = await inspect(active.handle);
      ensureCurrent(epoch, active);
      if (beforeCommit.signature !== active.signature) throw new Error(CONFLICT_MESSAGE);
      await writable.close();
      writable = null;
      const after = await inspect(active.handle);
      ensureCurrent(epoch, active);
      if (after.hash !== expectedHash) throw new Error('The file changed during backup verification. A completed backup could not be confirmed. Download your browser copy and connect a new file.');
      const next = { ...active, signature: after.signature, lastSaved: now() };
      // Only report success after close, read-back verification and durable
      // connection metadata. If metadata fails, the old baseline blocks later
      // writes instead of silently trusting a file on the next page load.
      await store.set(next);
      ensureCurrent(epoch, active);
      record = next;
      return publish({ lastSaved: next.lastSaved, error: '', permission: 'granted' });
    } catch (failure) {
      if (writable) { try { await writable.abort(); } catch { /* Keep the original error. */ } }
      if (failure?.name === 'NotAllowedError' || failure?.name === 'SecurityError') {
        let permission = 'unknown';
        try { permission = await queryPermission(active.handle); } catch { /* No request in background. */ }
        return publish({ permission, error: PERMISSION_MESSAGE });
      }
      return error(`File backup was not confirmed. ${textError(failure)} ${MANUAL_COPY}`);
    }
  }
  function settlePending() {
    if (!pending) return;
    for (const resolve of pending.waiters) resolve(snapshot());
    pending = null;
  }
  function startDrain() {
    if (drain || controls || !pending) return;
    drain = serial(async () => {
      await initialize();
      while (pending && !controls) {
        const item = pending;
        pending = null;
        try {
          if (settingsAvailable) await write(item);
        } catch (failure) {
          error(`File backup was not confirmed. ${textError(failure)} ${MANUAL_COPY}`);
        } finally {
          for (const resolve of item.waiters) resolve(snapshot());
        }
      }
    }).finally(() => { drain = null; startDrain(); });
  }
  function queueBackup(workspace) {
    let item;
    try { item = prepare(workspace); } catch (failure) { return Promise.resolve(error(textError(failure))); }
    const result = new Promise(resolve => {
      const waiters = pending?.waiters ?? [];
      waiters.push(resolve);
      pending = { ...item, waiters };
    });
    startDrain();
    return result;
  }
  async function getBackupState() {
    await initialize();
    if (record) {
      try {
        const active = record;
        const permission = await queryPermission(active.handle);
        if (record === active) publish({ permission, ...(permission === 'granted' ? {} : { error: PERMISSION_MESSAGE }) });
      } catch (failure) { error(`Could not check file access. ${textError(failure)} ${MANUAL_COPY}`); }
    }
    return snapshot();
  }
  async function connectBackup(workspace) {
    if (!supported) return error(`Connected file backups are unavailable in this browser. ${MANUAL_COPY}`);
    const connectionGeneration = generation;
    let item, selection;
    try {
      item = prepare(workspace);
      // The picker is deliberately invoked before any await to retain the
      // explicit button click's transient user activation.
      selection = pickFile({ id: 'research-atlas-backup', suggestedName: 'research-atlas-backup.json', types: [{ description: 'Research Atlas JSON backup', accept: { 'application/json': ['.json'] } }] });
    } catch (failure) { return error(`Could not connect a backup file. ${textError(failure)} ${MANUAL_COPY}`); }
    controls++;
    try {
      const handle = await selection;
      await initialize();
      return await serial(async () => {
        if (connectionGeneration !== generation) return snapshot();
        if (!settingsAvailable) return error(`Backup settings are unavailable, so the selected file was not written. ${MANUAL_COPY}`);
        if (!isEligible(item.data)) return error('The browser workspace changed while choosing a file. Connect again using its latest saved version.');
        const permission = await queryPermission(handle);
        if (permission !== 'granted') return error(`The selected file did not grant write access. ${MANUAL_COPY}`);
        const baseline = await inspect(handle);
        const next = { version: 1, handle, signature: baseline.signature, lastSaved: null };
        // Persist the handle before touching the selected file. Choosing an
        // existing file is explicit replacement authorization from the UI.
        await store.set(next);
        generation++;
        record = next;
        publish({ linked: true, name: handle.name || 'Backup file', permission, lastSaved: null, error: '' });
        return write(item);
      });
    } catch (failure) {
      if (failure?.name === 'AbortError') return snapshot();
      return error(`Could not connect the file backup. ${textError(failure)} ${MANUAL_COPY}`);
    } finally { controls--; startDrain(); }
  }
  async function resumeBackup(workspace) {
    let item;
    try { item = prepare(workspace); } catch (failure) { return error(textError(failure)); }
    // Loading state on page initialization makes the handle available at the
    // click. Do not defer a permission prompt behind IndexedDB or queued writes.
    if (!loaded) { await initialize(); return error('Backup information is ready. Click Resume again to allow access.'); }
    if (!record) return error(`Connect a backup file first. ${MANUAL_COPY}`);
    const active = record;
    let permissionRequest;
    try {
      permissionRequest = typeof active.handle.requestPermission === 'function'
        ? active.handle.requestPermission({ mode: 'readwrite' })
        : Promise.resolve('denied');
    } catch (failure) { return error(`Could not resume file access. ${textError(failure)} ${MANUAL_COPY}`); }
    controls++;
    try {
      const permission = await permissionRequest;
      return await serial(async () => {
        if (active !== record) return snapshot();
        publish({ permission });
        if (permission !== 'granted') return error(PERMISSION_MESSAGE);
        return write(item);
      });
    } catch (failure) { return error(`Could not resume file access. ${textError(failure)} ${MANUAL_COPY}`); }
    finally { controls--; startDrain(); }
  }
  async function disconnectBackup() {
    controls++;
    generation++;
    settlePending();
    try {
      await initialize();
      return await serial(async () => {
        record = null;
        publish({ linked: false, name: '', permission: 'unknown', lastSaved: null, error: '' });
        try { await store.clear(); }
        catch (failure) { error(`Disconnected for this session, but the browser could not forget the saved file connection. ${textError(failure)} It may reappear after reload; clear this site's backup settings before reusing it.`); }
        return snapshot();
      });
    } finally { controls--; settlePending(); }
  }
  function setBackupListener(fn) {
    listener = typeof fn === 'function' ? fn : null;
    try { listener?.(snapshot()); } catch { /* Ignore UI callback errors. */ }
    return () => { if (listener === fn) listener = null; };
  }
  async function requestDurableStorage() {
    const result = { persisted: false, usage: null, quota: null, error: '' };
    if (!storage) return { ...result, error: `Browser storage persistence is unavailable. ${MANUAL_COPY}` };
    const errors = [];
    try {
      result.persisted = typeof storage.persisted === 'function' ? await storage.persisted() : false;
      if (!result.persisted && typeof storage.persist === 'function') result.persisted = await storage.persist();
      if (!result.persisted) errors.push('The browser did not grant persistent storage.');
    } catch (failure) { errors.push(`Could not request persistent storage. ${textError(failure)}`); }
    try {
      const estimate = typeof storage.estimate === 'function' ? await storage.estimate() : {};
      result.usage = typeof estimate.usage === 'number' ? estimate.usage : null;
      result.quota = typeof estimate.quota === 'number' ? estimate.quota : null;
    } catch (failure) { errors.push(`Could not estimate browser storage. ${textError(failure)}`); }
    result.error = errors.join(' ');
    return result;
  }
  return { getBackupState, connectBackup, resumeBackup, disconnectBackup, queueBackup, setBackupListener, requestDurableStorage };
}

let controller;
const instance = () => controller ??= createBackupController();
export const getBackupState = () => instance().getBackupState();
export const connectBackup = workspace => instance().connectBackup(workspace);
export const resumeBackup = workspace => instance().resumeBackup(workspace);
export const disconnectBackup = () => instance().disconnectBackup();
export const queueBackup = workspace => instance().queueBackup(workspace);
export const setBackupListener = fn => instance().setBackupListener(fn);
export const requestDurableStorage = () => instance().requestDurableStorage();
