import test from 'node:test';
import assert from 'node:assert/strict';
import { createBackupController } from './local-backup.js';
import { createEmptyWorkspace, createDemoWorkspace, STORAGE_KEY } from './model.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function workspace(name = 'Personal research') { return createEmptyWorkspace(name); }
function memoryStore() {
  let saved;
  return {
    failRead: false, failWrite: false, failClear: false, writes: 0,
    async get() { if (this.failRead) throw new Error('Storage blocked'); return saved; },
    async set(value) { if (this.failWrite) throw new Error('Storage full'); this.writes++; saved = { ...value }; },
    async clear() { if (this.failClear) throw new Error('Storage blocked'); saved = undefined; },
    get saved() { return saved; },
  };
}
function fakeFile(content = 'Existing file content') {
  let text = content, modified = 1;
  const handle = {
    name: 'research-backup.json', kind: 'file', permission: 'granted', requestResult: 'granted',
    queries: 0, requests: 0, opens: 0, active: 0, maxActive: 0, aborts: 0,
    writes: [], beforeWrite: null, beforeClose: null, failWrite: false, failClose: false,
    get content() { return text; },
    change(value, keepTime = false) { text = value; if (!keepTime) modified++; },
    async queryPermission(options) { assert.equal(options.mode, 'readwrite'); this.queries++; return this.permission; },
    async requestPermission(options) { assert.equal(options.mode, 'readwrite'); this.requests++; this.permission = this.requestResult; return this.permission; },
    async getFile() {
      const captured = text, timestamp = modified;
      return { size: Buffer.byteLength(captured), lastModified: timestamp, arrayBuffer: async () => new TextEncoder().encode(captured).buffer };
    },
    async createWritable(options) {
      assert.equal(options.keepExistingData, false);
      this.opens++;
      this.active++;
      this.maxActive = Math.max(this.maxActive, this.active);
      let buffer = '', ended = false;
      const end = () => { if (!ended) { ended = true; this.active--; } };
      return {
        write: async value => {
          buffer = value;
          const hook = this.beforeWrite;
          this.beforeWrite = null;
          if (hook) await hook();
          if (this.failWrite) { this.failWrite = false; throw new Error('Disk full'); }
        },
        close: async () => {
          const hook = this.beforeClose;
          this.beforeClose = null;
          if (hook) await hook();
          if (this.failClose) { this.failClose = false; throw new Error('Close failed'); }
          this.writes.push(buffer);
          text = buffer;
          modified++;
          end();
        },
        abort: async () => { this.aborts++; end(); },
      };
    },
  };
  return handle;
}
function fixture(extra = {}) {
  const store = extra.store ?? memoryStore();
  const file = extra.file ?? fakeFile();
  let picks = 0, tick = 0;
  const controller = createBackupController({
    store, pickFile: () => { picks++; return Promise.resolve(file); }, isEligible: () => true,
    now: () => new Date(1700000000000 + tick++ * 1000).toISOString(), ...extra,
  });
  return { controller, store, file, get picks() { return picks; } };
}

test('unsupported browsers stay usable and do not access file or IndexedDB', async () => {
  const f = fixture({ supported: false });
  assert.equal((await f.controller.getBackupState()).supported, false);
  const result = await f.controller.connectBackup(workspace());
  assert.match(result.error, /Download a JSON backup/);
  assert.equal(f.picks, 0);
  assert.equal(f.store.writes, 0);
});

test('connect invokes picker within the click, writes a valid snapshot and persists its verified signature', async () => {
  const f = fixture(), data = workspace();
  const pending = f.controller.connectBackup(data);
  assert.equal(f.picks, 1, 'picker ran before connect returned a promise');
  const state = await pending;
  assert.equal(state.linked, true);
  assert.equal(state.name, f.file.name);
  assert.equal(state.error, '');
  assert.ok(state.lastSaved);
  assert.deepEqual(JSON.parse(f.file.content), data);
  assert.ok(f.store.saved.signature);
  assert.equal(f.store.saved.lastSaved, state.lastSaved);
  assert.equal(f.file.requests, 0);
});

test('reload and background saves never prompt; explicit resume can renew permission', async () => {
  const f = fixture();
  const original = await f.controller.connectBackup(workspace('Initial'));
  f.file.permission = 'prompt';
  const reloaded = fixture({ file: f.file, store: f.store });
  const state = await reloaded.controller.getBackupState();
  assert.equal(state.linked, true);
  assert.equal(state.permission, 'prompt');
  assert.equal(state.lastSaved, original.lastSaved);
  const before = f.file.writes.length;
  await reloaded.controller.queueBackup(workspace('Latest'));
  assert.equal(f.file.requests, 0);
  assert.equal(f.file.writes.length, before);
  assert.equal((await reloaded.controller.getBackupState()).lastSaved, original.lastSaved);
  const resuming = reloaded.controller.resumeBackup(workspace('Latest'));
  assert.equal(f.file.requests, 1, 'permission request occurs before any await in the click handler');
  const resumed = await resuming;
  assert.equal(resumed.permission, 'granted');
  assert.equal(resumed.error, '');
  assert.equal(JSON.parse(f.file.content).name, 'Latest');
});

test('coalesces pending revisions and never runs two writable streams together', async () => {
  const f = fixture();
  await f.controller.connectBackup(workspace('Initial'));
  f.file.writes.length = 0;
  const started = deferred(), release = deferred();
  f.file.beforeWrite = async () => { started.resolve(); await release.promise; };
  const first = f.controller.queueBackup(workspace('First'));
  await started.promise;
  const second = f.controller.queueBackup(workspace('Second'));
  const data = workspace('Third');
  const third = f.controller.queueBackup(data);
  data.name = 'Mutated after capture';
  release.resolve();
  await Promise.all([first, second, third]);
  assert.deepEqual(f.file.writes.map(raw => JSON.parse(raw).name), ['First', 'Third']);
  assert.equal(f.file.maxActive, 1);
});

test('a failed write does not discard a later pending revision or poison the serial queue', async () => {
  const f = fixture();
  await f.controller.connectBackup(workspace('Initial'));
  f.file.writes.length = 0;
  const started = deferred(), release = deferred();
  f.file.beforeWrite = async () => { started.resolve(); await release.promise; };
  f.file.failWrite = true;
  const first = f.controller.queueBackup(workspace('Failed revision'));
  await started.promise;
  const second = f.controller.queueBackup(workspace('Latest revision'));
  release.resolve();
  const [failure, success] = await Promise.all([first, second]);
  assert.match(failure.error, /Disk full/);
  assert.equal(success.error, '');
  assert.deepEqual(f.file.writes.map(raw => JSON.parse(raw).name), ['Latest revision']);
  assert.equal(f.file.aborts, 1);
  assert.equal(f.file.maxActive, 1);
  await f.controller.queueBackup(workspace('Next revision'));
  assert.equal(JSON.parse(f.file.content).name, 'Next revision');
});

test('content changes are conflicts even when length and modification time stay the same', async () => {
  const f = fixture();
  const connected = await f.controller.connectBackup(workspace('Initial'));
  const changed = f.file.content.replace('Initial', 'Outside');
  assert.equal(Buffer.byteLength(changed), Buffer.byteLength(f.file.content));
  f.file.change(changed, true);
  const before = f.file.opens;
  const state = await f.controller.queueBackup(workspace('New browser content'));
  assert.match(state.error, /changed outside/);
  assert.equal(state.lastSaved, connected.lastSaved);
  assert.equal(f.file.opens, before);
  assert.equal(f.file.content, changed);
  const resumed = await f.controller.resumeBackup(workspace('New browser content'));
  assert.match(resumed.error, /changed outside/);
  assert.equal(f.file.content, changed, 'renewing permission does not approve replacement');
});

test('an external change while streaming is detected before commit and the stream is aborted', async () => {
  const f = fixture();
  await f.controller.connectBackup(workspace('Initial'));
  f.file.beforeWrite = async () => { f.file.change('Written by another application'); };
  const state = await f.controller.queueBackup(workspace('Queued browser changes'));
  assert.match(state.error, /changed outside/);
  assert.equal(f.file.content, 'Written by another application');
  assert.equal(f.file.aborts, 1);
});

test('stored signature survives reload and blocks externally replaced content', async () => {
  const f = fixture();
  await f.controller.connectBackup(workspace('Initial'));
  f.file.change('External changes while the browser was closed');
  const reloaded = fixture({ file: f.file, store: f.store });
  assert.equal((await reloaded.controller.getBackupState()).linked, true);
  const state = await reloaded.controller.queueBackup(workspace('Browser data'));
  assert.match(state.error, /changed outside/);
  assert.equal(f.file.content, 'External changes while the browser was closed');
});

test('close and metadata failures never falsely advance lastSaved', async () => {
  const f = fixture();
  const first = await f.controller.connectBackup(workspace('Initial'));
  const originalContent = f.file.content;
  f.file.failClose = true;
  const failedClose = await f.controller.queueBackup(workspace('Failed close'));
  assert.equal(failedClose.lastSaved, first.lastSaved);
  assert.match(failedClose.error, /Close failed/);
  assert.equal(f.file.content, originalContent);
  f.store.failWrite = true;
  const failedMetadata = await f.controller.queueBackup(workspace('File written but metadata failed'));
  assert.equal(failedMetadata.lastSaved, first.lastSaved);
  assert.match(failedMetadata.error, /Storage full/);
  f.store.failWrite = false;
  const retry = await f.controller.queueBackup(workspace('Retry'));
  assert.match(retry.error, /changed outside/, 'missing durable baseline must not be silently adopted');
});

test('read-back verification refuses to claim success if another app changes the committed file', async () => {
  const f = fixture();
  const initial = await f.controller.connectBackup(workspace('Initial'));
  const originalGet = f.file.getFile;
  let reads = 0;
  f.file.getFile = async function () {
    reads++;
    if (reads === 3) this.change('External replacement after close');
    return originalGet.call(this);
  };
  const result = await f.controller.queueBackup(workspace('New version'));
  assert.match(result.error, /during backup verification/);
  assert.equal(result.lastSaved, initial.lastSaved);
  assert.equal(f.file.content, 'External replacement after close');
});

test('IndexedDB failures and picker cancellation preserve existing file contents', async () => {
  const f = fixture();
  f.store.failRead = true;
  const result = await f.controller.connectBackup(workspace());
  assert.match(result.error, /settings are unavailable/);
  assert.equal(f.file.content, 'Existing file content');
  assert.equal(f.file.opens, 0);
  const cancelled = fixture({ pickFile: () => Promise.reject(new DOMException('Cancelled', 'AbortError')) });
  assert.equal((await cancelled.controller.connectBackup(workspace())).linked, false);
  assert.equal(cancelled.file.opens, 0);
});

test('denied explicit resume does not write and does not schedule another permission request', async () => {
  const f = fixture();
  await f.controller.connectBackup(workspace('Initial'));
  f.file.permission = 'prompt';
  f.file.requestResult = 'denied';
  const before = f.file.writes.length;
  const state = await f.controller.resumeBackup(workspace('Current'));
  assert.equal(state.permission, 'denied');
  await f.controller.queueBackup(workspace('Newer'));
  assert.equal(f.file.requests, 1);
  assert.equal(f.file.writes.length, before);
});

test('disconnect aborts a pending commit, drops queued snapshots and forgets the handle', async () => {
  const f = fixture();
  await f.controller.connectBackup(workspace('Initial'));
  const original = f.file.content;
  const started = deferred(), release = deferred();
  f.file.beforeWrite = async () => { started.resolve(); await release.promise; };
  const writing = f.controller.queueBackup(workspace('Writing'));
  await started.promise;
  const queued = f.controller.queueBackup(workspace('Pending'));
  const disconnecting = f.controller.disconnectBackup();
  release.resolve();
  await Promise.all([writing, queued]);
  const result = await disconnecting;
  assert.equal(result.linked, false);
  assert.equal(f.store.saved, undefined);
  assert.equal(f.file.content, original);
  await f.controller.queueBackup(workspace('After disconnect'));
  assert.equal(f.file.content, original);
});

test('disconnect prevents a previously opened picker from reconnecting after it resolves', async () => {
  const choice = deferred();
  const f = fixture({ pickFile: () => choice.promise });
  const connecting = f.controller.connectBackup(workspace());
  await f.controller.disconnectBackup();
  choice.resolve(f.file);
  assert.equal((await connecting).linked, false);
  assert.equal(f.file.opens, 0);
  assert.equal(f.store.saved, undefined);
});

test('default eligibility requires the saved personal snapshot, rejects demo and ignores key order', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const saved = workspace('Personal');
  const node = { id: 'node-1', type: 'idea', title: 'Idea', body: '', status: 'seed', tags: [], fields: { why: 'Why', nextStep: 'Next' }, createdAt: saved.createdAt, updatedAt: saved.updatedAt };
  saved.nodes.push(node);
  let raw = JSON.stringify(saved);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem(key) { assert.equal(key, STORAGE_KEY); return raw; } } });
  try {
    const f = fixture({ isEligible: undefined });
    const equivalent = structuredClone(saved);
    equivalent.nodes[0].fields = { nextStep: 'Next', why: 'Why' };
    assert.equal((await f.controller.connectBackup(equivalent)).error, '');
    const original = f.file.content;
    assert.match((await f.controller.queueBackup(createDemoWorkspace())).error, /Example or unsaved/);
    const unsaved = { ...saved, name: 'Unsaved edit' };
    assert.match((await f.controller.queueBackup(unsaved)).error, /Example or unsaved/);
    assert.equal(f.file.content, original);
    raw = JSON.stringify(unsaved);
    assert.equal((await f.controller.queueBackup(unsaved)).error, '');
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('durable storage is only requested explicitly, with accurate denied/error reporting', async () => {
  let requests = 0;
  const storage = { persisted: async () => false, persist: async () => { requests++; return false; }, estimate: async () => ({ usage: 120, quota: 1000 }) };
  const f = fixture({ storage });
  await f.controller.getBackupState();
  await f.controller.connectBackup(workspace());
  assert.equal(requests, 0);
  const result = await f.controller.requestDurableStorage();
  assert.equal(requests, 1);
  assert.equal(result.persisted, false);
  assert.equal(result.usage, 120);
  assert.equal(result.quota, 1000);
  assert.match(result.error, /did not grant/);
  storage.persisted = async () => true;
  assert.equal((await f.controller.requestDurableStorage()).persisted, true);
  assert.equal(requests, 1, 'already durable storage does not request again');
  storage.estimate = async () => { throw new Error('Unavailable'); };
  assert.match((await f.controller.requestDurableStorage()).error, /estimate/);
});
