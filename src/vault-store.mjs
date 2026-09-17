import {validateWorkspace} from '../vendor/atlas/model.js';

export const MAX_BYTES = 25_000_000;
export function validateFolder(value) {
  if (typeof value !== 'string') throw new Error('Choose a vault-relative folder.');
  const result = value.trim().replace(/\\/g, '/').replace(/\/+$/, '');
  if (!result || result.split('/').some(p=>!p || p === '.' || p === '..' || p.startsWith('.') || /[<>:"|?*\x00-\x1f]/.test(p) || /[. ]$/.test(p)))
    throw new Error('Use a visible folder inside the vault, such as Research Atlas.');
  return result;
}
export function validateRaw(raw) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > MAX_BYTES) throw new Error('The workspace must be JSON smaller than 25 MB.');
  return validateWorkspace(JSON.parse(raw));
}
export async function ensureFolder(vault, path) {
  let prefix = '';
  for (const part of validateFolder(path).split('/')) {
    prefix = prefix ? `${prefix}/${part}` : part;
    const existing = vault.getAbstractFileByPath(prefix);
    if (existing && !('children' in existing)) throw new Error(`${prefix} is a file, not a folder.`);
    if (!existing) {
      try { await vault.createFolder(prefix); }
      catch (error) { if (!vault.getAbstractFileByPath(prefix)?.children) throw error; }
    }
  }
}
export function safeName(value) {
  return String(value).replace(/[<>:"/\\|?*\[\]#^\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim().slice(0,85).replace(/[. ]+$/,'') || 'Research note';
}

/** One instance per open view. Vault.process performs the last-moment compare. */
export class VaultStore {
  constructor(vault, folder, uniqueId = () => globalThis.crypto.randomUUID()) {
    this.vault = vault; this.folder = validateFolder(folder); this.path = `${this.folder}/workspace.json`;
    this.uniqueId = uniqueId; this.baseline = null; this.loaded = false; this.blocked = false;
    this.backedUp = false; this.tail = Promise.resolve();
  }
  async load() {
    const file = this.vault.getAbstractFileByPath(this.path);
    this.baseline = file ? await this.vault.read(file) : null;
    this.loaded = true;
    if (this.baseline !== null) {
      try { validateRaw(this.baseline); } catch (error) { this.blocked = true; throw error; }
    }
    return this.baseline;
  }
  save(raw) {
    const work = this.tail.then(()=>this.write(raw));
    this.tail = work.catch(()=>{});
    return work;
  }
  async write(raw) {
    if (!this.loaded || this.blocked) throw new Error('Saving paused. Export your current work, then reopen the saved vault copy.');
    validateRaw(raw);
    await ensureFolder(this.vault, this.folder);
    try {
      if (this.baseline === null) {
        // create() refuses to overwrite a file another view/device just created.
        await this.vault.create(this.path, raw);
      } else {
        const file = this.vault.getAbstractFileByPath(this.path);
        if (!file) throw new Error('The saved workspace was moved or deleted.');
        if (!this.backedUp) {
          await ensureFolder(this.vault, `${this.folder}/Backups`);
          await this.vault.create(`${this.folder}/Backups/before-session-${this.uniqueId()}.json`, this.baseline);
          this.backedUp = true;
        }
        await this.vault.process(file, current=>{
          if (current !== this.baseline) throw new Error('The vault copy changed in another view or device. Both versions are kept; export this view before reopening.');
          return raw;
        });
      }
      this.baseline = raw;
    } catch (error) { this.blocked = true; throw error; }
  }
}
