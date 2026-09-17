// Keep the full upstream app intact. Only host-specific adapters are applied at build time.
export function adaptApp(source) {
  const once=(from,to)=>{if(!source.includes(from)) throw new Error(`Atlas adapter drift: ${from.slice(0,70)}`); source=source.replace(from,()=>to);};
  source=source.replace(/\blocalStorage\b/g,'globalThis.__atlasStorage');
  once("storageError = loaded.error || ''", "storageError = loaded.error || globalThis.__atlasHost.initialError() || ''");
  once("mode==='demo'?'Example · session only':storageError?'Not saved':'Saved in this browser'", 'globalThis.__atlasHost.status(mode,storageError)');
  once("if(view==='reflections')renderReflections();", "if(view==='reflections')renderReflections();\n  globalThis.__atlasHost.paint();");
  once("if(view==='home')$('#main').innerHTML=deskPage(data,weekStart());", `if(view==='home'){$('#main').innerHTML=deskPage(data,weekStart());$('#main').insertAdjacentHTML('afterbegin','<section class="start-guide-strip"><div><h3>From a question to your next test</h3><p>Why it matters → where it is stuck → what changed → why the connection helps → what to test.</p></div><button type="button" class="button" data-help="research-path">Follow the five-step guide</button></section>');}`);
  const start=source.indexOf('function download('), end=source.indexOf('\nfunction exportData()',start);
  if(start<0||end<0)throw new Error('Download adapter location missing');
  source=source.slice(0,start)+"function download(name,text,mime='text/plain'){globalThis.__atlasHost.exportFile(name,text,mime);}"+source.slice(end);
  source=source.replaceAll('Backup downloaded. Keep it somewhere you can find again.', 'Export requested. Obsidian will confirm the saved file.');
  source=source.replaceAll('saved in this browser','queued for saving to your vault');
  once('Open this same address in the same browser to continue. You do not need to import your JSON again. Browser profiles and different addresses keep separate storage.', 'Reopen this vault to continue. The full workspace is saved in Research Atlas/workspace.json (or the folder chosen in plugin settings). Check the save indicator before closing.');
  const backupStart=source.indexOf('  <div class="data-option"><h3>Local saving & file backup</h3>');
  const backupEnd=source.indexOf('  <div class="data-option"><h3>Import & export</h3>',backupStart);
  if(backupStart<0||backupEnd<0)throw new Error('Backup panel adapter location missing');
  source=source.slice(0,backupStart)+`  <div class="data-option"><h3>Saved with your vault</h3><p>Your complete workspace is stored as JSON in your vault through the Obsidian Vault API. Before the first edit of an existing workspace in each view session, the plugin keeps a recovery copy in its Backups folder. Exports are additional dated copies in Exports.</p><p>Use the toolbar to export all records as linked Markdown notes. These are readable snapshots; edit research data here and use JSON to transfer a complete workspace. Your normal vault backup or sync service can include these files. Simultaneous editing on multiple devices still requires care.</p>\${helpButton('storage')}</div>\n`+source.slice(backupEnd);
  once("FIELDS.paper.push(['publishedOn','Source publication date or year']);", `FIELDS.paper.push(['publishedOn','Source publication date or year']);
for(const type of ['problem','idea','project']) FIELDS[type].push(['bottleneck','What specifically prevents progress?'],['changedConditions','What condition has changed?'],['connectionBasis','Why could this change address the bottleneck?']);
for(const fields of Object.values(FIELDS)) fields.push(['vaultNote','Linked Obsidian note path']);`);
  once("const titles={", `Object.assign(GUIDES, globalThis.__atlasMentoring.guides);
Object.assign(FIELD_HELP, globalThis.__atlasMentoring.fields);
const titles={`);
  once("['question','why','explanation','evidence','uncertainty','prediction'].filter", "['question','why','explanation','evidence','uncertainty','prediction','bottleneck','changedConditions','connectionBasis'].filter");
  once("const n=ws().nodes.find(n=>n.id===selectedId);const el=$('#inspector');if(!el)return;", "const n=ws().nodes.find(n=>n.id===selectedId);const el=$('#inspector');if(!el)return;");
  // All normal fields continue to render through the original escaping routine.
  once("const grow={paper:", `el.insertAdjacentHTML('beforeend', '<div class="inspector-workflow"><h3>In your vault</h3><button class="button small-button" data-action="link-vault-note">Link a vault note</button>'+(n.fields.vaultNote?'<button class="button small-button" data-action="open-vault-note">Open linked note</button>':'')+'</div>');
  const grow={paper:`);
  once("if(action==='export')exportData();", `if(action==='link-vault-note'){if(mode==='demo'){toast('Open your personal workspace to link your notes.');return;}globalThis.__atlasHost.send('choose-note',{nodeId:selectedId});}
  if(action==='open-vault-note'){const n=ws().nodes.find(n=>n.id===selectedId);if(n?.fields.vaultNote)globalThis.__atlasHost.send('open-note',{path:n.fields.vaultNote});}
  if(action==='export')exportData();`);
  // Incoming links update the live workspace, preserving changes made while the picker was open.
  once("$('#editor-dialog').addEventListener('close',()=>{pendingOrigin=null;});", `$('#editor-dialog').addEventListener('close',()=>{pendingOrigin=null;});
window.addEventListener('atlas-note-selected',event=>{const {nodeId,path}=event.detail;const n=personal?.nodes.find(n=>n.id===nodeId);if(mode!=='personal'||!n)return;updateState(upsertNode(personal,{...n,fields:{...n.fields,vaultNote:path},updatedAt:now()}),'Vault note linked.');});
window.addEventListener('atlas-import-note',event=>{if(mode!=='personal'){toast('Open your personal workspace, then capture the note again.');return;}const {path,title,selection}=event.detail;const node=createNode('reflection',{title,body:selection||'Record why this note matters, what it changes, and what remains uncertain.',fields:{vaultNote:path,sourceRef:path,provenance:'User-selected vault note; interpretation not inferred.'}});updateState(upsertNode(personal,node),'Note captured. Add your interpretation when ready.');selectNode(node.id);});`);
  return source;
}
export function adaptModel(source) {
  return source.replaceAll('globalThis.localStorage','globalThis.__atlasStorage').replaceAll('saved in this browser','saved to the vault');
}
