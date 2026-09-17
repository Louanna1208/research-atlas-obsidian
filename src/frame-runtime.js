// No browser persistence: the host acknowledges writes through the Vault API.
const channel = 'research-atlas-v1';
const token = globalThis.__atlasToken;
let memory = null, seq = 0, acknowledged = 0, error = '', initialError = '', readyResolve;
const ready = new Promise(resolve=>readyResolve=resolve);
function send(type, payload = {}) { parent.postMessage({channel, token, type, ...payload}, '*'); }
function paint() {
  const el = document.querySelector('#save-status');
  if (el && !el.textContent.startsWith('Example')) el.textContent = error ? 'Not saved to vault' : seq > acknowledged ? 'Saving to vault…' : 'Saved in vault';
  let warning = document.querySelector('#vault-error');
  if (!warning) { warning = document.createElement('div'); warning.id = 'vault-error'; warning.className = 'storage-error'; warning.setAttribute('role','alert'); document.querySelector('#storage-alert')?.append(warning); }
  if (warning) { warning.hidden = !error; warning.textContent = error ? `${error} Export your workspace before closing. Use Reopen saved copy in the Obsidian toolbar after keeping a copy.` : ''; }
}
globalThis.__atlasStorage = {
  getItem:()=>memory,
  setItem(key, value) {
    if (error) throw new Error(error);
    memory=value;
    send('save', {raw:value, seq:++seq});
    paint();
  },
};
globalThis.__atlasHost = {
  send,
  status: (mode, localError)=>mode === 'demo' ? 'Example · session only' : error || localError ? 'Not saved to vault' : seq > acknowledged ? 'Saving to vault…' : 'Saved in vault',
  paint,
  exportFile: (name, text, mime)=>send('export',{name,text,mime}),
  initialError:()=>initialError,
};
window.addEventListener('message', event=>{
  if (event.source !== parent || event.data?.channel !== channel || event.data?.token !== token) return;
  const message=event.data;
  if (message.type === 'init') { memory=message.raw; initialError=message.error || ''; error=initialError; readyResolve(); }
  if (message.type === 'saved') { acknowledged=Math.max(acknowledged,message.seq); paint(); }
  if (message.type === 'save-error') { error=message.error || 'Vault write failed.'; paint(); }
  if (message.type === 'note-selected') window.dispatchEvent(new CustomEvent('atlas-note-selected',{detail:message}));
  if (message.type === 'import-note') window.dispatchEvent(new CustomEvent('atlas-import-note',{detail:message}));
});
document.addEventListener('click', event=>{
  const link=event.target.closest?.('a[href]');
  if (!link) return;
  const href=link.getAttribute('href');
  if (href.startsWith('agent-skill/')) { event.preventDefault(); send('asset',{path:href}); }
  else if (/^https?:\/\//i.test(href)) { event.preventDefault(); send('external',{url:href}); }
  else if (href === './') { event.preventDefault(); document.querySelector('[data-view="home"]')?.click(); }
});
send('ready');
await ready;
await import('../vendor/atlas/app.js');
paint();
send('app-ready');
