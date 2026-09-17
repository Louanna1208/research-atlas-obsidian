import {TYPES, STATUS, createEmptyWorkspace, createDemoWorkspace, createNode, createEdge, upsertNode, removeNode, upsertEdge, removeEdge, appendDecision, validateWorkspace, loadWorkspace, saveWorkspace, previewMerge, applyMerge, weekStart} from './model.js';
import {mountGraph} from './graph.js';
import {deskPage, weeklyPage, journalPage, unifiedJournal, guidePage, guideBody, inlineHelp, helpButton, decisionCard} from './workflow-ui.js';
import {GUIDES, FIELD_HELP} from './guide.js';
import {getBackupState, connectBackup, resumeBackup, disconnectBackup, queueBackup, setBackupListener, requestDurableStorage} from './local-backup.js';

const $ = (q,scope=document)=>scope.querySelector(q);
const $$ = (q,scope=document)=>[...scope.querySelectorAll(q)];
const esc = value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pretty = value=>String(value??'').replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
const date = value=>new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric'}).format(new Date(value));
const month = ()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
const now = ()=>new Date().toISOString();
const uid = ()=>crypto.randomUUID();
const loaded = loadWorkspace();
let personal = loaded.workspace;
let demo = createDemoWorkspace();
const storageKey='research-atlas.workspace.v1';
let savedBaseline;try{savedBaseline=localStorage.getItem(storageKey);}catch{savedBaseline=null;}
const hasContent = data=>!!data&&(data.nodes.length+data.decisions.length+data.reviews.length+(data.plans?.length||0))>0;
let mode = personal&&(hasContent(personal)||savedBaseline!==null) ? 'personal' : 'demo';
let view = 'home', listMode = false, selectedId = null, filter = '', statusFilter = '', search = '', neighborhood = false;
let compare = new Set(), comparisonOpen = false, graph = null, toastTimer, storageError = loaded.error || '', undoWorkspace = null;
let storageConflict=false;
let activeWeek=weekStart(),learningMonth=month(),journalKind='all',guideTopic='home',fullscreen=false,pendingImport=null,pendingChange=null,pendingOrigin=null;
let backupState={supported:false,linked:false,name:'',permission:'prompt',lastSaved:'',error:''};
const ws = ()=>mode === 'demo' ? demo : personal;
const typeLabel = type=>TYPES[type]?.label || pretty(type);
const statuses = Array.isArray(STATUS) ? STATUS.map(s=>typeof s==='string'?s:s.value) : ['seed','exploring','active','paused','archived'];
const FIELDS = {
  problem:[['why','Why does it matter?'],['uncertainty','What is still unresolved?'],['nextStep','What would help you learn more?'],['restart','What new capability could unlock it?']],
  idea:[['why','Why is this interesting?'],['trigger','What sparked it?'],['audience','Who would care, and what could change?'],['advantage','Why you or your team?'],['uncertainty','Most fragile assumption'],['nextStep','Smallest informative test'],['restart','When would you revisit it?'],['learning','What do you want to learn?']],
  paper:[['sourceUrl','Source link'],['evidence','What does the source actually support?'],['uncertainty','Limits, doubts, or open questions'],['why','How did it change your thinking?'],['nextStep','What do you want to follow up?']],
  capability:[['evidence','What work demonstrates this ability?'],['contribution','What did you personally do?'],['uncertainty','Where do you still need support?'],['learning','What would you like to learn next?']],
  resource:[['sourceUrl','Resource link'],['evidence','What is available, and under what conditions?'],['contribution','Who created or maintains it?'],['uncertainty','Access conditions or limitations']],
  project:[['question','Research question'],['explanation','Current explanations'],['evidence','Evidence supporting or challenging them'],['uncertainty','What can the evidence not yet distinguish?'],['prediction','What result would change your judgment?'],['nextStep','Next informative action'],['contribution','Your contribution'],['learning','Learning goal'],['restart','Pause or restart conditions'],['sourceUrl','Artifact or project link']],
  reflection:[['why','What changed your mind?'],['evidence','What evidence informed this?'],['nextStep','What follows from it?']],
  person:[['evidence','Relevant expertise'],['contribution','How might you help each other?'],['nextStep','What would you like to discuss?']],
  claim:[['claimKind','Statement kind'],['claimStatus','Evidence status'],['sourceRef','Source or analysis reference'],['sourceVersion','Source / analysis version'],['evidence','What supports or challenges this statement?'],['uncertainty','Limits and alternative explanations'],['prediction','A prediction that could test it'],['changeReason','Reason for a change in evidence status']]
};
FIELDS.paper.push(['publishedOn','Source publication date or year']);
for(const fields of Object.values(FIELDS))for(const entry of [['sourceRef','Source or memory reference'],['sourceVersion','Source / analysis version'],['provenance','Whose account or interpretation is this?']])if(!fields.some(([key])=>key===entry[0]))fields.push(entry);
const titles={home:'Research desk',atlas:'Research atlas',portfolio:'Idea portfolio',week:'This week',reflections:'Reflections',guide:'Research guide'};

function toast(message,undo=false){clearTimeout(toastTimer);$('#toast').innerHTML=`${esc(message)}${undo?'<button type="button" data-action="undo">Undo</button>':''}`;$('#toast').hidden=false;toastTimer=setTimeout(()=>{$('#toast').hidden=true;},undo?10000:4800);}
function clearUndo(){undoWorkspace=null;clearTimeout(toastTimer);$('#toast').hidden=true;}
function rememberUndo(workspace){undoWorkspace={workspace,mode,id:workspace.id};}
function updateState(next,message){
  clearUndo();
  next=validateWorkspace({...next,updatedAt:now()});
  if(mode==='demo'){demo=next;}else{
    personal=next;
    try{if(localStorage.getItem(storageKey)!==savedBaseline)storageConflict=true;}catch{}
    if(storageConflict){storageError='Another tab changed the saved workspace. Your current changes are kept on this page only. Export them before loading the saved copy.';}
    else{const result=saveWorkspace(personal);storageError=result.ok?'':result.error||'Changes could not be saved. Export a backup before closing this page.';if(result.ok){try{savedBaseline=localStorage.getItem(storageKey);}catch{}queueBackup(personal).catch(()=>{});}}
  }
  render();if(message)toast(mode==='personal'&&storageError?'Changes kept on this page; export a backup before leaving.':message+(mode==='demo'?' · example only':''));
}
function typeTag(type){return `<span class="type-label type-${esc(type)}"><i class="type-dot" aria-hidden="true"></i>${esc(typeLabel(type))}</span>`;}
function statusTag(status){return `<span class="status ${esc(status)}">${esc(pretty(status))}</span>`;}
function options(values,current,label=pretty){return values.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(label(v))}</option>`).join('');}
function empty(title,text,action='new',label='Capture a thought'){return `<div class="empty-state"><div class="empty-icon" aria-hidden="true">⌘</div><h2>${esc(title)}</h2><p>${esc(text)}</p><button class="button primary" type="button" data-action="${action}">${esc(label)}</button></div>`;}
function heading(eyebrow,title,description,extra=''){return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${extra}</div>`;}
function destroyGraph(){graph?.destroy();graph=null;}
function filteredNodes(){
  const related=new Set();if(search)ws().edges.forEach(e=>{if((e.relation+' '+e.reason).toLowerCase().includes(search.toLowerCase())){related.add(e.source);related.add(e.target);}});
  let nodes=ws().nodes.filter(n=>(!filter||n.type===filter)&&(!statusFilter||n.status===statusFilter)&&(!search||related.has(n.id)||[n.title,n.body,...n.tags,...Object.values(n.fields)].join(' ').toLowerCase().includes(search.toLowerCase())));
  if(neighborhood&&selectedId){const ids=new Set([selectedId]);ws().edges.forEach(e=>{if(e.source===selectedId)ids.add(e.target);if(e.target===selectedId)ids.add(e.source);});nodes=nodes.filter(n=>ids.has(n.id));}
  return nodes;
}
function render(){
  destroyGraph();
  document.body.classList.toggle('map-fullscreen',fullscreen&&view==='atlas');
  const data=ws();
  if(!selectedId||!data.nodes.some(n=>n.id===selectedId))selectedId=data.nodes[0]?.id||null;
  $('#workspace-name').textContent=mode==='demo'?'Example workspace':data.name||'My research';
  $('#view-label').textContent=titles[view];
  $('#save-status').textContent=mode==='demo'?'Example · session only':storageError?'Not saved':'Saved in this browser';
  $('#mode-banner').innerHTML=mode==='demo'?`<div class="mode-banner"><div><span class="banner-label">EXAMPLE WORKSPACE</span>Explore a fictional research journey. Your own notes stay separate.</div><button type="button" class="button small-button" data-action="personal">${hasContent(personal)?'Open my workspace':'Start my workspace'} <span aria-hidden="true">↗</span></button></div>`:'';
  $('#storage-alert').innerHTML=storageError?`<div class="storage-error">${esc(storageError)} <button type="button" class="text-button" data-action="data">Open backup & recovery</button>${storageConflict?' · <button type="button" class="text-button" data-action="reload-saved">Load saved copy</button>':''}</div>`:'';
  $$('#navigation button').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);if(b.dataset.view===view)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  $('#type-navigation').innerHTML=Object.keys(TYPES).map(t=>`<button type="button" class="type-${t}" data-filter="${t}" aria-pressed="${filter===t}"><i class="type-dot" aria-hidden="true"></i>${esc(typeLabel(t))}<span class="count">${data.nodes.filter(n=>n.type===t).length}</span></button>`).join('');
  if(view==='atlas')renderAtlas();
  if(view==='home')$('#main').innerHTML=deskPage(data,weekStart());
  if(view==='guide')$('#main').innerHTML=guidePage(guideTopic);
  if(view==='portfolio')renderPortfolio();
  if(view==='week')renderWeek();
  if(view==='reflections')renderReflections();
}

function renderAtlas(){
  $('#main').innerHTML=heading('THE BIGGER PICTURE','Your research, connected.','Follow a question. Find a connection. Leave room for the next idea.',`<span class="page-meta">${ws().nodes.length} elements · ${ws().edges.length} connections</span>`)+`
  <div class="atlas-layout"><div class="atlas-primary"><section class="atlas-panel" aria-label="Research map">
    <div class="atlas-toolbar"><label class="search-wrap"><span aria-hidden="true">⌕</span><input id="atlas-search" type="search" placeholder="Find a question, thought, or connection…" value="${esc(search)}" aria-label="Search research elements"></label><div class="segmented" aria-label="Atlas view"><button type="button" data-action="map" class="${!listMode?'active':''}" aria-pressed="${!listMode}">Map</button><button type="button" data-action="list" class="${listMode?'active':''}" aria-pressed="${listMode}">List</button></div></div>
    <div class="filter-row"><select id="type-filter" aria-label="Filter by type"><option value="">All types</option>${options(Object.keys(TYPES),filter,typeLabel)}</select><select id="status-filter" aria-label="Filter by status"><option value="">All stages</option>${options(statuses,statusFilter)}</select><label class="check-label"><input type="checkbox" id="neighborhood" ${neighborhood?'checked':''}>Selected neighborhood</label></div>
    <div id="atlas-content"></div>
    <div class="graph-footer"><div class="legend">${['problem','idea','paper','capability'].map(t=>`<span class="type-${t}"><i class="type-dot" aria-hidden="true"></i>${esc(typeLabel(t))}</span>`).join('')}</div><div class="row-actions"><button type="button" class="text-button" data-action="fullscreen">${fullscreen?'↙ Exit full screen':'⛶ Full screen'}</button><button type="button" class="text-button" data-action="connect">＋ Connect elements</button></div></div>
  </section><p id="focus-caption" class="focus-caption"></p>
  <div class="insight-strip"><button type="button" class="insight-item" data-view="portfolio"><div class="eyebrow">MAKE A CHOICE</div><h3>Which idea deserves a closer look?</h3><p>Compare the question, the uncertainty, and your next small test.</p></button><button type="button" class="insight-item" data-view="reflections"><div class="eyebrow">MAKE A CONNECTION</div><h3>Old questions. New possibilities.</h3><p>Revisit a question with something you learned this month.</p></button></div>
  </div><aside id="inspector" class="inspector" aria-label="Selected research element"></aside></div>`;
  updateMap();renderInspector();
  $('#atlas-search').addEventListener('input',e=>{search=e.target.value;updateMap();});
  $('#type-filter').addEventListener('change',e=>{filter=e.target.value;updateMap();updateTypeButtons();});
  $('#status-filter').addEventListener('change',e=>{statusFilter=e.target.value;updateMap();});
  $('#neighborhood').addEventListener('change',e=>{neighborhood=e.target.checked;updateMap();});
}
function updateTypeButtons(){$$('#type-navigation button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));}
function updateMap(){
  const nodes=filteredNodes();const ids=new Set(nodes.map(n=>n.id));const edges=ws().edges.filter(e=>ids.has(e.source)&&ids.has(e.target));
  $('#focus-caption').innerHTML=`${nodes.length} of ${ws().nodes.length} elements shown${neighborhood?' · Direct connections to your selection':''}. Layout distance does not measure scientific similarity.${selectedId&&!ids.has(selectedId)?' <strong>Your selected record is outside these filters.</strong> <button type="button" class="text-button" data-action="reveal">Clear filters to reveal it</button>':''}`;
  if(listMode){destroyGraph();$('#atlas-content').innerHTML=nodes.length?`<div class="library-list">${nodes.map(n=>`<button type="button" data-select="${esc(n.id)}" class="library-row ${n.id===selectedId?'selected':''} type-${n.type}"><i class="type-dot" aria-hidden="true"></i><span class="library-row-content"><strong>${esc(n.title)}</strong><p>${esc(n.body||n.fields.why||typeLabel(n.type))}</p></span>${statusTag(n.status)}</button>`).join('')}</div>`:empty('Nothing here yet.','Try another search or capture something worth returning to.');return;}
  if(!nodes.length){destroyGraph();$('#atlas-content').innerHTML=empty(ws().nodes.length?'No matching elements.':'Start with a question.','A question, a paper, or a half-formed idea is enough. You can make connections as you go.');return;}
  if(graph){graph.update({nodes,edges,selectedId});return;}
  $('#atlas-content').innerHTML='<div class="graph-stage"><div id="graph-host" class="graph-host"></div><div class="graph-controls" aria-label="Map controls"><button type="button" data-action="zoom-in" aria-label="Zoom in">＋</button><button type="button" data-action="zoom-out" aria-label="Zoom out">−</button><button type="button" data-action="zoom-reset">Fit map</button></div><span class="graph-help">Select to explore · drag to arrange</span></div>';
  graph=mountGraph($('#graph-host'),{nodes,edges,selectedId,onSelect:selectNode});
}
function selectNode(id){selectedId=id;if(view!=='atlas'){view='atlas';render();}else{updateMap();renderInspector();}}
function renderInspector(){
  const n=ws().nodes.find(n=>n.id===selectedId);const el=$('#inspector');if(!el)return;
  if(!n){el.innerHTML='<div class="inspector-empty"><h2>A place for the unfinished.</h2><p class="muted">Capture what you are wondering about. A useful research map grows one connection at a time.</p></div>';return;}
  const edges=ws().edges.filter(e=>e.source===n.id||e.target===n.id);
  el.innerHTML=`<div class="inspector-top"><div class="inspector-type">${typeTag(n.type)}${statusTag(n.status)}</div><h2>${esc(n.title)}</h2><div class="tags">${n.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></div>
  <div class="inspector-body"><p class="prose">${esc(n.body||'Add a note to remember why this matters.')}</p>${Object.entries(n.fields).filter(([k,v])=>v).map(([k,v])=>`<div class="inspector-field"><span class="field-caption">${esc((FIELDS[n.type].find(f=>f[0]===k)||[k,pretty(k)])[1])}</span>${k==='sourceUrl'?`<a href="${esc(v)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>`:`<p class="prose">${esc(v)}</p>`}</div>`).join('')}<div class="inspector-actions"><button type="button" class="button small-button" data-edit="${esc(n.id)}">Edit element</button><button type="button" class="button small-button ghost" data-action="discuss">Prepare discussion ↗</button></div></div>
  <div class="connections"><div class="section-caption"><h3>Connections <span class="muted">${edges.length}</span></h3><button type="button" class="text-button small" data-action="connect">＋ Add</button></div>${edges.length?edges.map(e=>{const outgoing=e.source===n.id;const other=ws().nodes.find(v=>v.id===(outgoing?e.target:e.source));return `<div class="connection"><div class="connection-label">${outgoing?'Outgoing':'Incoming'} · ${esc(e.relation)}${e.status==='suggested'?' · suggested':''}</div><button type="button" class="connection-title" data-select="${esc(other.id)}">${esc(other.title)}</button><p class="connection-reason">${esc(e.reason||'No reason recorded yet.')}</p><button type="button" class="connection-edit" data-edge="${esc(e.id)}">Edit connection</button></div>`;}).join(''):'<p class="small muted">Connect this to a question, a piece of evidence, or something it made you think of.</p>'}</div><div class="inspector-bottom">Added ${date(n.createdAt)} · Updated ${date(n.updatedAt)}</div>`;
  const grow={paper:['problem','raises','Extract a question'],problem:['idea','inspires','Sketch a possible approach'],idea:['project','develops into','Plan a project'],project:['claim','investigates','Record an observation or prediction'],claim:['reflection','prompts','Reflect on this evidence']}[n.type];
  const changes=ws().decisions.filter(d=>d.nodeId===n.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  el.insertAdjacentHTML('beforeend',`<div class="inspector-workflow"><h3>Continue the reasoning</h3>${helpButton(n.type)}<div class="row-actions">${grow?`<button type="button" class="button small-button" data-grow="${grow[0]}" data-relation="${grow[1]}">${grow[2]}</button>`:''}<button type="button" class="button small-button" data-action="plan" data-node="${esc(n.id)}">Plan a step</button><button type="button" class="button small-button" data-action="decision" data-node="${esc(n.id)}">Record a judgment</button></div><p class="small muted">${n.eventDate?`Research event: ${esc(n.eventDate)}. `:''}${n.learnedOn?`Learned on: ${esc(n.learnedOn)}. `:['paper','capability','resource'].includes(n.type)?'Learning date not recorded; excluded from monthly new knowledge. ':''}${n.importedAt?`Imported: ${esc(date(n.importedAt))}.`:''}</p></div>${edges.some(e=>e.status==='suggested')?`<div class="inspector-workflow"><h3>Suggestions awaiting your judgment</h3><p class="small muted">Review the reason and its source before adopting a connection. Recorded does not mean scientifically established.</p>${edges.filter(e=>e.status==='suggested').map(e=>`<div class="suggestion-review"><p>${esc(ws().nodes.find(x=>x.id===e.source)?.title)} → ${esc(e.relation)} → ${esc(ws().nodes.find(x=>x.id===e.target)?.title)}</p><div class="row-actions"><button type="button" class="text-button small" data-accept-edge="${esc(e.id)}">Review & accept</button><button type="button" class="text-button small" data-edge="${esc(e.id)}">Revise</button><button type="button" class="text-button small" data-reject-edge="${esc(e.id)}">Reject</button></div></div>`).join('')}</div>`:''}${changes.length?`<div class="inspector-workflow"><h3>How this thinking changed</h3>${changes.map(d=>decisionCard(d,ws())).join('')}</div>`:''}`);
}

function renderPortfolio(){
  const ideas=ws().nodes.filter(n=>n.type==='idea');compare=new Set([...compare].filter(id=>ideas.some(n=>n.id===id)));
  $('#main').innerHTML=heading('CHOOSING WHAT TO PURSUE','Give your ideas a fair hearing.','Compare possibilities, preserve your reasons, and start with a small test.',`<button class="button primary" type="button" data-new-type="idea">＋ New idea</button>`)+`
  <div class="portfolio-toolbar"><p>${ideas.length} ideas · Select two or three to compare. No single score needed.</p><button class="button" type="button" data-action="compare" ${compare.size<2?'disabled':''}>${comparisonOpen?'Hide comparison':`Compare selected (${compare.size})`}</button></div>
  ${comparisonOpen&&compare.size>=2?comparisonTable(ideas.filter(n=>compare.has(n.id))):''}
  ${ideas.length?`<div class="idea-grid">${ideas.map(n=>`<article class="idea-card"><div class="card-top">${statusTag(n.status)}<label class="compare-label"><input type="checkbox" data-compare="${esc(n.id)}" ${compare.has(n.id)?'checked':''}>Compare</label></div><h2>${esc(n.title)}</h2><p class="prose">${esc(n.body)}</p>${[['audience','Who would care?'],['uncertainty','Main uncertainty'],['nextStep','Smallest informative test']].map(([k,l])=>`<div class="card-field"><span class="field-caption">${l}</span><p class="prose">${esc(n.fields[k]||'Not yet recorded')}</p></div>`).join('')}<div class="card-actions"><button type="button" class="button small-button" data-edit="${esc(n.id)}">Develop idea</button><button type="button" class="button small-button ghost" data-action="decision" data-node="${esc(n.id)}">Record a decision</button></div></article>`).join('')}</div>`:empty('Keep the spark.','Write enough to recover why an idea interested you, even months from now.','new-idea','Capture an idea')}`;
}
function comparisonTable(ideas){return `<div class="surface comparison-wrap" style="padding:0;margin-bottom:24px"><table class="comparison"><thead><tr><th>Consider</th>${ideas.map(n=>`<th>${esc(n.title)}</th>`).join('')}</tr></thead><tbody>${[['why','Why it matters'],['audience','Audience'],['advantage','Your advantage'],['uncertainty','Uncertainty'],['nextStep','Smallest test'],['learning','Training value'],['restart','Revisit when']].map(([k,l])=>`<tr><th>${l}</th>${ideas.map(n=>`<td>${esc(n.fields[k]||'Not yet recorded')}</td>`).join('')}</tr>`).join('')}<tr><th>Choose a next move</th>${ideas.map(n=>`<td><p>Try now, gather evidence, pause, or let go—with a reason.</p><button type="button" class="button small-button" data-action="decision" data-node="${esc(n.id)}">Record my choice</button></td>`).join('')}</tr></tbody></table></div>`;}
function timeline(entries,kind){return entries.length?`<div class="timeline">${[...entries].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(e=>`<article class="timeline-entry"><div class="entry-date">${date(e.createdAt)}${e.period?` · ${esc(e.period)}`:''}</div><h3>${esc(e.title)}</h3><p class="entry-body">${esc(e.body)}</p>${e.nodeId?`<button type="button" class="inline-link small" data-select="${esc(e.nodeId)}">${esc(ws().nodes.find(n=>n.id===e.nodeId)?.title||'Related element')} ↗</button>`:''}<div class="entry-actions"><button class="text-button" type="button" data-edit-entry="${esc(e.id)}" data-kind="${kind}">Edit</button><button class="text-button" type="button" data-delete-entry="${esc(e.id)}" data-kind="${kind}">Delete</button></div></article>`).join('')}</div>`:'<p class="muted small">Your next decision can become the first entry.</p>';}
function renderWeek(){
  $('#main').innerHTML=weeklyPage(ws(),activeWeek);
  $('#week-picker').addEventListener('change',e=>{if(e.target.value){activeWeek=weekStart(new Date(e.target.value+'T12:00:00'));render();}});
}

function renderReflections(){
  $('#main').innerHTML=journalPage(ws(),learningMonth,journalKind);
  $('#learning-month').addEventListener('change',e=>{if(e.target.value){learningMonth=e.target.value;render();}});
  $('#journal-kind').addEventListener('change',e=>{journalKind=e.target.value;render();});
}

function dialogHead(title,description='',id='editor-title'){return `<div class="dialog-head"><div><h2 id="${id}">${title}</h2>${description?`<p>${description}</p>`:''}</div><button class="button ghost icon-button" type="button" data-close aria-label="Close dialog">×</button></div>`;}
function field(name,label,value='',kind='textarea',hint=''){
  const key=name.replace('field:',''),hintId='hint-'+name.replace(/[^a-zA-Z0-9_-]/g,'-');
  const aria=`aria-label="${esc(label)}"${hint?` aria-describedby="${hintId}"`:''}`;
  const control=kind==='textarea'?`<textarea name="${esc(name)}" ${aria} rows="3" maxlength="30000">${esc(value)}</textarea>`:`<input type="${kind}" name="${esc(name)}" ${aria} value="${esc(value)}" maxlength="${name==='title'?'500':'3000'}" ${name==='title'?'required':''}>`;
  return `<div class="form-field ${kind==='textarea'?'full':''}"><label><span class="field-label">${esc(label)}</span>${hint?`<span class="hint" id="${hintId}">${esc(hint)}</span>`:''}${control}</label>${inlineHelp(key)}</div>`;
}
function recordField(key,label,value){
  const choices=key==='claimKind'?['observation','explanation','prediction','limitation']:key==='claimStatus'?['provisional','supported','challenged']:null;
  return choices?`<div class="form-field"><label><span class="field-label">${esc(label)}</span><select name="field:${key}" aria-label="${esc(label)}"><option value="">Choose a category</option>${options(choices,value)}</select></label>${inlineHelp(key)}</div>`:field('field:'+key,label,value||'',key==='sourceUrl'?'url':'textarea');
}

function showEditor(n=null,type='idea'){
  const isEdit=!!n;type=n?.type||type;const el=$('#editor-dialog');
  el.innerHTML=`<form id="node-form">${dialogHead(isEdit?'Develop this element':'Capture a thought','One clear sentence is enough to start. Expand the guide when you want to think further.')}<div class="dialog-content"><div id="capture-guide">${helpButton(type)}</div><div class="form-grid"><label class="form-field"><span>Element type</span><select name="type" id="editor-type">${options(Object.keys(TYPES),type,typeLabel)}</select>${inlineHelp('type')}</label><label class="form-field"><span>Stage</span><select name="status">${options(statuses,n?.status||'seed')}</select>${inlineHelp('status')}</label><div class="full">${field('title','Title',n?.title||'','text')}</div>${field('body','Your note',n?.body||'','textarea','Preserve your words and the reason you want to return to them.')}<div class="full">${field('tags','Tags',n?.tags.join(', ')||'','text','Separate with commas.')}</div></div><details class="develop-details" ${isEdit?'open':''}><summary>Develop the reasoning · optional</summary><div class="form-grid" id="extra-fields"></div></details><details class="develop-details"><summary>Dates & learning history · optional</summary><div class="form-grid">${field('eventDate','When did this research event happen?',n?.eventDate||'','date','Leave blank if unknown. This is separate from when a record was added.')}${field('learnedOn','When did you read or learn this?',n?.learnedOn||'','date','Monthly new knowledge uses this date. Importing an old note does not make it new knowledge.')}</div>${n?.importedAt?`<p class="small muted">Imported ${date(n.importedAt)}. Original dates are retained.</p>`:''}</details><p class="form-error" id="editor-error" role="alert"></p></div><div class="dialog-footer">${isEdit?`<button type="button" class="button danger" data-delete-node="${esc(n.id)}">Delete</button><span class="spacer"></span>`:''}<button type="button" class="button" data-close>Cancel</button><button class="button primary" type="submit">${isEdit?'Save changes':'Add to atlas'}</button></div></form>`;
  let draftFields={...(n?.fields||{})};
  const writeFields=()=>{$('#extra-fields').innerHTML=FIELDS[type].map(([key,label])=>recordField(key,label,draftFields[key]||'')).join('');$('#capture-guide').innerHTML=helpButton(type);};writeFields();
  $('#editor-type').addEventListener('change',e=>{new FormData($('#node-form')).forEach((v,k)=>{if(k.startsWith('field:'))draftFields[k.slice(6)]=String(v);});type=e.target.value;writeFields();});
  $('#node-form').addEventListener('submit',e=>{
    e.preventDefault();const data=new FormData(e.target);data.forEach((v,k)=>{if(k.startsWith('field:'))draftFields[k.slice(6)]=String(v).trim();});
    try{
      const values={...(n||{}),type,title:String(data.get('title')).trim(),body:String(data.get('body')).trim(),status:String(data.get('status')),tags:String(data.get('tags')).split(/[,，]/).map(t=>t.trim()).filter(Boolean),fields:draftFields,eventDate:String(data.get('eventDate')||''),learnedOn:String(data.get('learnedOn')||'')};
      if(!values.title)throw new Error('Give this element a title.');
      const statusChanged=n?.type==='claim'&&n.fields.claimStatus!==draftFields.claimStatus;
      if(statusChanged&&!draftFields.changeReason?.trim())throw new Error('Explain the new evidence or limitation behind the change in evidence status.');
      const node=isEdit?values:createNode(type,values);let next=upsertNode(ws(),node);
      const changedFields=isEdit?['question','why','explanation','evidence','uncertainty','prediction'].filter(k=>(n.fields[k]||'')!==(node.fields[k]||'')):[];
      if(statusChanged)next=appendDecision(next,{nodeId:node.id,title:'Evidence status revised: '+node.title,body:draftFields.changeReason,before:n.fields.claimStatus||'Not classified',trigger:draftFields.sourceRef||draftFields.evidence||'',after:draftFields.claimStatus||'Not classified',action:draftFields.nextStep||''});
      selectedId=node.id;el.close();updateState(next,isEdit?'Changes saved':'Added to your atlas');
      if(changedFields.length){pendingChange={nodeId:node.id,before:changedFields.map(k=>`${pretty(k)}: ${n.fields[k]||'Not recorded'}`).join('\n'),after:changedFields.map(k=>`${pretty(k)}: ${node.fields[k]||'Not recorded'}`).join('\n')};toast('Research reasoning changed.');$('#toast').innerHTML+=' <button type="button" data-action="record-change">Record why</button>';}
      if(!isEdit&&pendingOrigin){const origin=pendingOrigin;pendingOrigin=null;showConnection(createEdge(origin.id,node.id,{relation:origin.relation,reason:'',status:'suggested'}));}
    }catch(error){$('#editor-error').textContent=error.message;}
  });el.showModal();requestAnimationFrame(()=>$('input[name=title]',el).focus());
}

function showConnection(edge=null){
  if(ws().nodes.length<2){toast('Add at least two elements before connecting them.');return;}
  const existing=edge&&ws().edges.some(e=>e.id===edge.id),el=$('#editor-dialog'),nodes=ws().nodes;
  const nodeOptions=current=>nodes.map(n=>`<option value="${esc(n.id)}" ${n.id===current?'selected':''}>${esc(n.title)}</option>`).join('');
  const source=edge?.source||selectedId||nodes[0].id,target=edge?.target||nodes.find(n=>n.id!==source).id;
  el.innerHTML=`<form id="edge-form">${dialogHead(existing?'Edit the reasoning behind a connection':'Make a connection','A link is a judgment. State the evidence, conditions, and consequences.')}<div class="dialog-content">${helpButton('connections')}<div class="form-grid"><label class="form-field"><span>From</span><select name="source">${nodeOptions(source)}</select>${inlineHelp('source')}</label><label class="form-field"><span>To</span><select name="target">${nodeOptions(target)}</select>${inlineHelp('target')}</label><label class="form-field"><span>Relationship</span><input name="relation" aria-label="Relationship" value="${esc(edge?.relation||'informs')}" list="relations" required maxlength="120"><datalist id="relations">${['supports','challenges','depends on','provides a measurement','offers an alternative explanation','changes the question','inspires the next test','raises','demonstrates','informs'].map(v=>`<option value="${v}">`).join('')}</datalist><span class="hint">Use a suggestion or name your own relation.</span>${inlineHelp('relation')}</label><label class="form-field"><span>Connection status</span><select name="status"><option value="confirmed" ${edge?.status!=='suggested'?'selected':''}>My recorded judgment</option><option value="suggested" ${edge?.status==='suggested'?'selected':''}>Suggestion to review</option></select><span class="hint">A recorded judgment is not a claim of scientific truth.</span>${inlineHelp('edgeStatus')}</label>${field('reason','Why do these connect?',edge?.reason||'','textarea','What is the basis, when does the connection hold, and what does it change?')}<details class="field-help full"><summary>A useful reasoning pattern</summary><p>Previously I thought… This source or observation changed… The connection applies if… Therefore the next useful step is…</p><p>Keep observations, proposed explanations, and predictions separate. For an agent suggestion, record its source and accept it only after reviewing the basis.</p></details></div><p class="form-error" id="editor-error" role="alert"></p></div><div class="dialog-footer">${existing?`<button type="button" class="button danger" data-delete-edge="${esc(edge.id)}">Delete connection</button><span class="spacer"></span>`:''}<button class="button" type="button" data-close>Cancel</button><button class="button primary" type="submit">Save connection</button></div></form>`;
  $('#edge-form').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{if(d.source===d.target)throw new Error('Choose two different elements.');if(!d.relation.trim())throw new Error('Name the relationship.');if(!d.reason.trim())throw new Error('Add a brief reason so you can recover this connection later.');const value=edge?{...edge,...d}:createEdge(d.source,d.target,d);const next=upsertEdge(ws(),value);validateWorkspace(next);el.close();updateState(next,'Connection saved');}catch(error){$('#editor-error').textContent=error.message;}});el.showModal();
}

function showEntry(kind,nodeId=null,entry=null,prefill={}){
  const review=kind==='review',el=$('#editor-dialog'),draft={...prefill,...entry};
  el.innerHTML=`<form id="entry-form">${dialogHead(review?'A moment to look back':'Record a research choice',review?'Connect old questions with new learning.':'Preserve what you thought, what changed, and the action that follows.')}<div class="dialog-content">${helpButton(review?'review':'portfolio')}<div class="form-grid">${field('title','Title',draft.title||(review?'Monthly reflection':''),'text')}<label class="form-field"><span>Related element</span><select name="nodeId"><option value="">General research record</option>${ws().nodes.map(n=>`<option value="${esc(n.id)}" ${n.id===(draft.nodeId||nodeId)?'selected':''}>${esc(n.title)}</option>`).join('')}</select></label>${review?`<label class="form-field"><span>Month</span><input name="period" type="month" value="${esc(draft.period||learningMonth)}" required>${inlineHelp('period')}</label>`:`<label class="form-field"><span>Research choice</span><select name="outcome"><option value="">Record reasoning without changing stage</option>${[['proceed','Try now'],['evidence','Gather evidence first'],['pause','Pause with a revisit condition'],['drop','Let go for now']].map(([k,l])=>`<option value="${k}" ${draft.outcome===k?'selected':''}>${l}</option>`).join('')}</select></label>`}${!review&&entry?'<label class="check-label full"><input type="checkbox" name="applyChoice"> Also apply this historical choice to the element’s current stage</label>':''}${field('body',review?'Your reflection':'Decision and reasoning',draft.body||'','textarea',review?'What did you learn, what changed, and what would be useful to try next?':'Why does this choice make sense with the evidence and resources you have?')}${!review?`${field('before','Previous judgment',draft.before||'')}${field('trigger','New evidence or feedback',draft.trigger||'')}${field('after','Revised judgment',draft.after||'')}${field('action','Action or revisit condition',draft.action||'')}`:''}</div><p class="form-error" id="editor-error" role="alert"></p></div><div class="dialog-footer"><button class="button" type="button" data-close>Cancel</button><button class="button primary" type="submit">Save ${review?'reflection':'decision'}</button></div></form>`;
  $('#entry-form').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));try{if(!d.title.trim()||!d.body.trim())throw new Error('Add a title and a few words about your reasoning.');if(d.outcome==='pause'&&!d.action.trim())throw new Error('Record the condition that would make this worth revisiting.');const value={id:entry?.id||uid(),title:d.title.trim(),body:d.body.trim(),nodeId:d.nodeId||null,createdAt:entry?.createdAt||now(),...(review?{period:d.period}:{before:d.before,trigger:d.trigger,after:d.after,action:d.action,outcome:d.outcome})};const key=review?'reviews':'decisions';let next={...ws(),[key]:entry?ws()[key].map(v=>v.id===entry.id?value:v):[...ws()[key],value]};
    if(!review&&d.nodeId&&d.outcome&&(!entry||d.applyChoice==='on')){const n=next.nodes.find(n=>n.id===d.nodeId),stage={proceed:'active',evidence:'exploring',pause:'paused',drop:'archived'}[d.outcome];next=upsertNode(next,{...n,status:stage,fields:{...n.fields,...(d.outcome==='pause'?{restart:d.action}:d.action?{nextStep:d.action}:{})}});}
    next=validateWorkspace(next);el.close();pendingChange=null;updateState(next,review?'Reflection saved':'Research choice recorded');}catch(error){$('#editor-error').textContent=error.message;}});el.showModal();
}

function confirmAction(title,body,label='Continue'){
  const el=$('#confirm-dialog');el.innerHTML=`${dialogHead(esc(title),'','confirm-title')}<div class="dialog-content"><p class="small prose">${esc(body)}</p></div><div class="dialog-footer"><button class="button" type="button" data-cancel>Cancel</button><button class="button primary" type="button" data-confirm>${esc(label)}</button></div>`;return new Promise(resolve=>{let settled=false;const done=value=>{if(settled)return;settled=true;el.close();resolve(value);};$('[data-confirm]',el).onclick=()=>done(true);$('[data-cancel]',el).onclick=()=>done(false);$('[data-close]',el).onclick=()=>done(false);el.oncancel=()=>done(false);el.showModal();});
}
function download(name,text,mime='text/plain'){const url=URL.createObjectURL(new Blob([text],{type:mime}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);}
function exportData(){download(`research-atlas-${mode==='demo'?'example-':''}${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(ws(),null,2),'application/json');toast('Backup downloaded. Keep it somewhere you can find again.');}
function showData(){
  const el=$('#utility-dialog');
  el.innerHTML=`${dialogHead('Your workspace','Daily work saves here automatically. Imports bring in new material or move a workspace.','utility-title')}<div class="dialog-content"><div class="data-option"><h3>${mode==='demo'?'Example workspace · temporary':'Personal workspace · automatically saved'}</h3><p>${mode==='demo'?'The example is a fictional walkthrough; edits disappear on refresh. Your personal workspace is separate.':'Open this same address in the same browser to continue. You do not need to import your JSON again. Browser profiles and different addresses keep separate storage.'}</p><button type="button" class="button primary" data-action="personal">${hasContent(personal)?'Open my workspace':'Start my workspace'}</button><button type="button" class="button" data-action="demo">Explore example</button></div>
  <div class="data-option"><h3>Local saving & file backup</h3><p>Browser saving is the working copy. Keep a file backup as protection against clearing browser data or changing devices.</p><div id="backup-status" class="backup-status"></div><div class="row-actions">${mode==='personal'?'<button type="button" class="button" data-action="link-backup">Connect a backup file</button>':''}<button type="button" class="button" data-action="durable-storage">Request persistent browser storage</button></div><p class="small muted">Connecting a backup file writes the current personal workspace to the file you choose. Subsequent personal saves update it while permission remains granted. It is not cloud sync.</p>${helpButton('storage')}</div>
  <div class="data-option"><h3>Import & export</h3><p>Merge additional material after previewing new records, possible duplicates, and conflicting versions. Existing content is kept unless you explicitly choose another version.</p><button type="button" class="button" data-action="export">Export ${mode==='demo'?'example':'my'} workspace</button><button type="button" class="button" data-action="import">Import & preview</button>${!personal&&storageError?'<button type="button" class="button" data-action="recover">Download recovery data</button>':''}${helpButton('import')}</div>
  <div class="data-option"><h3>Build your atlas with your own agent</h3><p>Give your agent this skill and the memories or sources it can actually access. For later updates, include your latest workspace export so it can reuse IDs and preserve your judgments.</p><a class="button primary" href="agent-skill/research-atlas-memory.zip" download>Download agent skill (.zip)</a><a class="button" href="agent-skill/research-atlas-memory/SKILL.md" download>Download SKILL.md</a><a class="button" href="agent-skill/research-atlas-memory/references/schema.md" download>JSON schema guide</a><button type="button" class="button" data-action="agent-prompt">Copy starter prompt</button></div>
  <div class="data-option"><h3>Your content stays with you</h3><p>No account, analytics, cloud sync, or live AI call is made by this app. Keep agent-inferred claims provisional and connections suggested until you review their sources and reasoning. You decide what to share with an external assistant.</p></div></div><div class="dialog-footer"><button type="button" class="button" data-close>Done</button></div>`;
  el.showModal();refreshBackupUI();
}
async function openPersonal(){
  let initialize=savedBaseline===null;
  if(!personal){if(!await confirmAction('Create a new workspace?','The saved workspace could not be read. Download the recovery data first if needed. Creating a fresh workspace will replace unreadable saved data.','Create new workspace'))return;personal=createEmptyWorkspace();initialize=true;}
  clearUndo();mode='personal';view='home';selectedId=null;compare.clear();$('#utility-dialog').close();if(initialize)updateState(personal,'Personal workspace ready');else render();
}

function discussionText(n){const edges=ws().edges.filter(e=>e.source===n.id||e.target===n.id);return `# Research discussion: ${n.title}\n\n## My original thought\n${n.body}\n\n${Object.entries(n.fields).filter(([,v])=>v).map(([k,v])=>`## ${pretty(k)}\n${v}`).join('\n\n')}\n\n## Recorded connections\n${edges.map(e=>`- ${ws().nodes.find(x=>x.id===e.source)?.title} → ${e.relation} → ${ws().nodes.find(x=>x.id===e.target)?.title}\n  Status: ${e.status}. Reason: ${e.reason}`).join('\n')}\n\n## What I would like help with\n1. Restate the question and make assumptions explicit.\n2. Identify alternatives and the most consequential uncertainty.\n3. Suggest the smallest informative test and what its outcomes would change.\n4. Separate evidence from speculation. Cite sources only when verified.\n5. Keep my original judgment visible; propose changes for me to consider.\n\nThis brief contains my notes and judgments, not independently verified findings.\n`;}
function showDiscussion(){
  const n=ws().nodes.find(n=>n.id===selectedId);if(!n)return;
  const text=discussionText(n),el=$('#utility-dialog');el.innerHTML=`${dialogHead('Prepare a discussion','Review the brief, then copy or download it for a conversation.','utility-title')}<div class="dialog-content"><label class="form-field"><span>Discussion brief</span><textarea id="discussion-text" rows="15">${esc(text)}</textarea></label><p class="small muted" style="margin-top:13px">Nothing is sent automatically. Only this element and its recorded connections are included.</p></div><div class="dialog-footer"><button type="button" class="button" id="download-discussion">Download .md</button><button type="button" class="button primary" id="copy-discussion">Copy brief</button></div>`;el.showModal();$('#download-discussion').onclick=()=>download('research-discussion.md',$('#discussion-text').value,'text/markdown');$('#copy-discussion').onclick=async()=>{try{await navigator.clipboard.writeText($('#discussion-text').value);toast('Discussion brief copied.');}catch{$('#discussion-text').select();toast('Select and copy the brief, or download it.');}};
}
function agenda(){const data=ws(),plans=data.plans.filter(p=>p.week===activeWeek);download('research-meeting-agenda.md',`# Research meeting — week of ${activeWeek}\n\n## Current focus\n${data.nodes.filter(n=>data.focusIds.includes(n.id)).map(n=>`- ${n.fields.question||n.title}\n  Still uncertain: ${n.fields.uncertainty||'Not yet recorded'}`).join('\n')}\n\n## Steps chosen for this week\n${plans.map(p=>`- [${p.done?'x':' '}] ${p.action}\n  Why: ${p.why}\n  What could change: ${p.outcome}`).join('\n')}\n\n## Recent judgment changes\n${data.decisions.slice(-6).map(d=>`### ${d.title}\nBefore: ${d.before}\nNew evidence: ${d.trigger}\nNow: ${d.after}\n${d.body}\nNext: ${d.action}`).join('\n\n')}\n\n## Questions for discussion\n\n## Decisions from this meeting\n`,'text/markdown');toast('Meeting agenda exported.');}

function journal(){const entries=unifiedJournal(ws()).reverse();download('research-journal.md',`# ${ws().name} — Research journal\n\n${entries.map(e=>`## ${e.title}\n${e.entryDate} · ${e.entryKind}\n\n${e.before?`Before: ${e.before}\n`:''}${e.trigger?`New evidence: ${e.trigger}\n`:''}${e.after?`Now: ${e.after}\n`:''}${e.body}\n${e.action?`Next: ${e.action}`:''}`).join('\n\n---\n\n')}`,'text/markdown');toast('Complete research journal exported.');}

function showHelp(key){const el=$('#help-dialog');el.innerHTML=dialogHead(esc(GUIDES[key]?.title||'Research guide'),'A thinking companion, with prompts and worked examples.','help-title')+`<div class="dialog-content">${guideBody(key)}</div>`;el.showModal();}
function showFocus(){const el=$('#editor-dialog');el.innerHTML=dialogHead('Choose your current focus','Choose a few questions you want to return to. This is independent of project stage.')+`<form id="focus-form"><div class="dialog-content focus-picker">${ws().nodes.map(n=>`<label><input type="checkbox" name="focus" value="${esc(n.id)}" ${ws().focusIds.includes(n.id)?'checked':''}><span>${typeTag(n.type)}<strong>${esc(n.title)}</strong></span></label>`).join('')||'<p>Capture a question first, then bring it onto your desk.</p>'}${inlineHelp('focusIds')}${helpButton('home')}</div><div class="dialog-footer"><button class="button primary" type="submit">Save focus</button></div></form>`;$('#focus-form').addEventListener('submit',e=>{e.preventDefault();const focusIds=new FormData(e.target).getAll('focus');el.close();updateState({...ws(),focusIds},'Focus updated');});el.showModal();}
function showPlan(nodeId=null,entry=null){
  if(!ws().nodes.length){toast('Capture a question or project before planning a step.');showEditor(null,'problem');return;}
  const el=$('#editor-dialog');el.innerHTML=dialogHead(entry?'Edit a planned step':'Choose an informative step','A useful plan names the uncertainty it reduces. Choose a week explicitly.')+`<form id="plan-form"><div class="dialog-content"><div class="form-grid"><label class="form-field full"><span>Related element</span><select name="nodeId">${ws().nodes.map(n=>`<option value="${esc(n.id)}" ${n.id===(entry?.nodeId||nodeId||selectedId)?'selected':''}>${esc(n.title)}</option>`).join('')}</select></label>${field('week','Week containing',entry?.week||activeWeek,'date')}${field('action','Next informative action',entry?.action||'')}${field('why','What uncertainty will this reduce?',entry?.why||'')}${field('outcome','Outcome / what happened (fill after the step)',entry?.outcome||'')}</div>${helpButton('week')}<p id="editor-error" class="form-error" role="alert"></p></div><div class="dialog-footer">${entry?`<button type="button" class="button danger" data-delete-plan="${esc(entry.id)}">Delete step</button><span class="spacer"></span>`:''}<button type="button" class="button" data-close>Cancel</button><button type="submit" class="button primary">Save this step</button></div></form>`;
  $('#plan-form').addEventListener('submit',e=>{e.preventDefault();try{const d=Object.fromEntries(new FormData(e.target));if(!d.action.trim()||!d.week)throw new Error('Add an action and choose a week.');const value={...d,id:entry?.id||uid(),week:weekStart(new Date(d.week+'T12:00:00')),done:entry?.done||false,createdAt:entry?.createdAt||now(),updatedAt:now()};const next={...ws(),plans:entry?ws().plans.map(p=>p.id===entry.id?value:p):[...ws().plans,value]};validateWorkspace(next);el.close();updateState(next,'Step saved for the selected week');}catch(error){$('#editor-error').textContent=error.message;}});el.showModal();
}
function paintBackupState(){const el=$('#backup-status');if(!el)return;const s=backupState;el.innerHTML=`<p>${!s.supported?'Connected file backup is not supported in this browser. Browser autosave still works; use Export to keep a JSON backup.':s.linked?`Connected file: <strong>${esc(s.name)}</strong>. ${s.error?'Backup needs attention.':s.permission==='granted'?'Ready for personal workspace saves.':'Permission is needed to resume file updates.'}`:'No backup file connected.'}${s.lastSaved?` Last confirmed file save: ${esc(date(s.lastSaved))}.`:''}</p>${s.error?`<p class="form-error">${esc(s.error)}</p>`:''}${s.linked?`<div class="row-actions"><button type="button" class="button small-button" data-action="resume-backup">Resume file backup</button><button type="button" class="text-button" data-action="disconnect-backup">Disconnect file</button></div>`:''}`;}
async function refreshBackupUI(){backupState=await getBackupState();paintBackupState();}
function ensurePersonalSaved(){if(mode!=='personal')throw new Error('Open your personal workspace first.');if(storageConflict||storageError||localStorage.getItem(storageKey)!==savedBaseline)throw new Error('Resolve the browser saving warning or load the latest saved copy first.');const result=saveWorkspace(personal);if(!result.ok)throw new Error(result.error);savedBaseline=localStorage.getItem(storageKey);}
function commitImportedWorkspace(next){
  if(storageConflict||localStorage.getItem(storageKey)!==savedBaseline)throw new Error('The saved workspace changed. Load its latest copy before importing again.');
  const normalized=validateWorkspace(next);const result=saveWorkspace(normalized);if(!result.ok)throw new Error(result.error);
  clearUndo();personal=normalized;mode='personal';storageError='';storageConflict=false;savedBaseline=localStorage.getItem(storageKey);selectedId=null;view='home';filter='';search='';statusFilter='';neighborhood=false;compare.clear();pendingImport=null;
  $('#import-dialog').close();$('#utility-dialog').close();queueBackup(personal).catch(()=>{});render();toast('Workspace imported and saved in this browser.');
}
function showImportPreview(incoming){
  if(storageConflict)throw new Error('Load the saved copy before importing, so the preview uses the latest workspace.');
  if(!personal&&storageError)throw new Error('Recover the unreadable browser data before importing. Open Backup & recovery first.');
  pendingImport=validateWorkspace(incoming);const base=personal||createEmptyWorkspace();const preview=previewMerge(base,pendingImport);const el=$('#import-dialog');
  const counts=o=>Object.entries(o).map(([k,v])=>`${v} ${k}`).join(' · ');
  el.innerHTML=dialogHead('Preview your import',`Importing “${esc(pendingImport.name)}” into your personal workspace. Nothing changes until you apply.`, 'import-title')+`<form id="import-form"><div class="dialog-content"><div class="import-summary"><p><strong>New:</strong> ${esc(counts(preview.additions))}</p><p><strong>Already present:</strong> ${esc(counts(preview.unchanged))}</p><p><strong>${preview.conflicts.length} conflicting versions</strong> · ${preview.possibleDuplicates.length} possible title duplicates</p></div><label class="form-field"><span>Import mode</span><select id="import-mode" name="mode"><option value="merge">Merge into my workspace</option><option value="replace">Replace my entire workspace</option></select></label><p class="small muted">Matching IDs are merged. Similar titles with different IDs remain separate. Research and learning dates are preserved; importing today does not mean learning today.</p><div id="merge-conflicts">${preview.conflicts.map(c=>`<section class="import-conflict"><h3>${esc(c.title||c.id)}</h3><p class="small muted">${esc(c.collection)} · Changed: ${esc(c.changedFields.join(', '))}</p><div class="conflict-columns"><details><summary>My current version</summary><pre>${esc(JSON.stringify(c.current,null,2))}</pre></details><details><summary>Incoming version</summary><pre>${esc(JSON.stringify(c.incoming,null,2))}</pre></details></div><label class="form-field"><span>Choose which version to keep</span><select data-conflict="${esc(c.key)}"><option value="">Choose explicitly…</option value="keep">Keep my current version</option><option value="incoming">Use incoming version</option><option value="both">Keep both versions</option></select></label></section>`).join('')}${preview.possibleDuplicates.length?`<details class="import-conflict"><summary>Review similar titles (${preview.possibleDuplicates.length})</summary><p class="small">These have different IDs and will be added separately. You can cancel to align IDs in the source JSON.</p>${preview.possibleDuplicates.map(d=>`<p>${esc(d.title)} <small>(${esc(d.existingId)} / ${esc(d.incomingId)})</small></p>`).join('')}</details>`:''}</div><p id="import-warning" class="form-error"></p>${helpButton('import')}</div><div class="dialog-footer"><button type="button" class="button" data-close>Cancel</button><button type="submit" class="button primary">Apply import</button></div></form>`;
  $('#import-mode').addEventListener('change',e=>{$('#merge-conflicts').hidden=e.target.value==='replace';$('#import-warning').textContent=e.target.value==='replace'?'Replacement removes the existing personal workspace, including its notes, relationships, plans and history. Export a backup first.':'';});
  $('#import-form').addEventListener('submit',async e=>{e.preventDefault();try{if($('#import-mode').value==='replace'){if(!await confirmAction('Replace your entire workspace?','This discards the existing personal workspace. An exported backup is the way to recover it.','Replace workspace'))return;commitImportedWorkspace({...pendingImport,nodes:pendingImport.nodes.map(n=>({...n,importedAt:now()}))});}else{const choices={};$$('[data-conflict]',el).forEach(input=>{if(input.value)choices[input.dataset.conflict]=input.value;});commitImportedWorkspace(applyMerge(base,pendingImport,choices));}}catch(error){$('#import-warning').textContent=error.message;}});el.showModal();
}

document.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-close')){b.closest('dialog')?.close();return;}
  if(b.dataset.help){showHelp(b.dataset.help);return;}
  if(b.dataset.guideTopic){guideTopic=b.dataset.guideTopic;render();$('.guide-title')?.scrollIntoView({block:'start',behavior:'instant'});return;}
  if(b.dataset.editPlan){showPlan(null,ws().plans.find(p=>p.id===b.dataset.editPlan));return;}
  if(b.dataset.deletePlan){const previous=ws();$('#editor-dialog').close();updateState({...ws(),plans:ws().plans.filter(p=>p.id!==b.dataset.deletePlan)});rememberUndo(previous);toast('Planned step deleted.',true);return;}
  if(b.dataset.acceptEdge){const edge=ws().edges.find(x=>x.id===b.dataset.acceptEdge);showConnection({...edge,status:'confirmed'});return;}
  if(b.dataset.rejectEdge){const previous=ws();updateState(removeEdge(ws(),b.dataset.rejectEdge));rememberUndo(previous);toast('Suggestion rejected.',true);return;}
  if(b.dataset.grow){pendingOrigin={id:selectedId,relation:b.dataset.relation};showEditor(null,b.dataset.grow);return;}
  if(b.dataset.view){view=b.dataset.view;render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(b.dataset.filter){filter=filter===b.dataset.filter?'':b.dataset.filter;view='atlas';neighborhood=false;render();return;}
  if(b.dataset.select){selectNode(b.dataset.select);return;}
  if(b.dataset.edit){showEditor(ws().nodes.find(n=>n.id===b.dataset.edit));return;}
  if(b.dataset.newType){showEditor(null,b.dataset.newType);return;}
  if(b.dataset.edge){showConnection(ws().edges.find(x=>x.id===b.dataset.edge));return;}
  if(b.dataset.editEntry){const kind=b.dataset.kind;showEntry(kind,null,ws()[kind==='review'?'reviews':'decisions'].find(x=>x.id===b.dataset.editEntry));return;}
  if(b.dataset.deleteEntry){if(await confirmAction('Delete this entry?','This removes the recorded entry. You can undo immediately after deleting.','Delete')){const previous=ws();const key=b.dataset.kind==='review'?'reviews':'decisions';updateState({...ws(),[key]:ws()[key].filter(x=>x.id!==b.dataset.deleteEntry)});rememberUndo(previous);toast('Entry deleted.',true);}return;}
  if(b.dataset.deleteNode){const n=ws().nodes.find(n=>n.id===b.dataset.deleteNode);if(await confirmAction('Delete this element?',`“${n.title}” and its connections will be removed. Linked decisions will remain in your history.`,'Delete')){const previous=ws();$('#editor-dialog').close();updateState(removeNode(ws(),n.id));rememberUndo(previous);toast('Element deleted.',true);}return;}
  if(b.dataset.deleteEdge){const previous=ws();$('#editor-dialog').close();updateState(removeEdge(ws(),b.dataset.deleteEdge));rememberUndo(previous);toast('Connection deleted.',true);return;}
  const action=b.dataset.action;
  if(action==='new')showEditor(null,filter||'idea');
  if(action==='new-idea')showEditor(null,'idea');
  if(action==='new-project')showEditor(null,'project');
  if(action==='personal')await openPersonal();
  if(action==='demo'){clearUndo();mode='demo';selectedId=null;view='home';filter='';search='';statusFilter='';neighborhood=false;compare.clear();$('#utility-dialog').close();render();}
  if(action==='data')showData();
  if(action==='connect')showConnection();
  if(action==='focus')showFocus();
  if(action==='plan')showPlan(b.dataset.node||null);
  if(action==='record-change'&&pendingChange){showEntry('decision',pendingChange.nodeId,null,{...pendingChange,title:'A change in my research reasoning'});pendingChange=null;}
  if(action==='previous-week'||action==='next-week'){const d=new Date(activeWeek+'T12:00:00');d.setDate(d.getDate()+(action==='previous-week'?-7:7));activeWeek=weekStart(d);render();}
  if(action==='current-week'){activeWeek=weekStart();render();}
  if(action==='connect-review'){const source=$('#review-question').value,target=$('#review-knowledge').value;if(!source||!target){toast('Choose an old question and something learned in this month.');return;}showConnection(createEdge(target,source,{relation:'may unlock',reason:'',status:'suggested'}));}
  if(action==='fullscreen'){fullscreen=!fullscreen;render();}
  if(action==='reveal'){filter='';statusFilter='';search='';neighborhood=false;render();}
  if(action==='link-backup'||action==='resume-backup'){try{ensurePersonalSaved();backupState=await (action==='link-backup'?connectBackup(personal):resumeBackup(personal));paintBackupState();}catch(error){toast(error.message);}}
  if(action==='disconnect-backup'){await disconnectBackup();await refreshBackupUI();}
  if(action==='durable-storage'){const result=await requestDurableStorage();toast(result.persisted?'Persistent browser storage granted. Keep a file backup as well.':result.error||'The browser did not grant persistence. Browser autosave remains available.');}
  if(action==='agent-prompt'){const text='Use the attached Research Atlas memory skill and its schema. Build an importable JSON from memories and sources you can actually access. Do not invent dates, findings, ownership, or confirmations. Preserve uncertainty and mark inferred relationships as suggested. If I provide an existing workspace export, reuse its IDs and preserve my judgments. Return the validated JSON plus a short summary of sources used and unresolved gaps.';try{await navigator.clipboard.writeText(text);toast('Starter prompt copied.');}catch{download('research-atlas-agent-prompt.txt',text);}}
  if(action==='discuss')showDiscussion();
  if(action==='map'||action==='list'){listMode=action==='list';render();}
  if(action==='zoom-in')graph?.zoomIn();
  if(action==='zoom-out')graph?.zoomOut();
  if(action==='zoom-reset')graph?.reset();
  if(action==='compare'){comparisonOpen=!comparisonOpen;render();}
  if(action==='decision')showEntry('decision',b.dataset.node||null);
  if(action==='review')showEntry('review');
  if(action==='export')exportData();
  if(action==='import')$('#import-file').click();
  if(action==='recover'){try{download('research-atlas-recovery.txt',localStorage.getItem('research-atlas.workspace.v1')||'No stored data found.');}catch{toast('Browser storage is unavailable.');}}
  if(action==='agenda')agenda();
  if(action==='journal')journal();
  if(action==='undo'&&undoWorkspace){const previous=undoWorkspace;if(previous.mode===mode&&previous.id===ws().id)updateState(previous.workspace,'Deletion undone');else clearUndo();}
  if(action==='reload-saved'&&await confirmAction('Load the saved copy?','Unsaved changes on this page will be replaced. Export your current workspace first if you want to keep them.','Load saved copy')){const result=loadWorkspace();if(result.workspace){clearUndo();personal=result.workspace;try{savedBaseline=localStorage.getItem(storageKey);}catch{}storageConflict=false;storageError='';mode='personal';selectedId=null;render();toast('Saved copy loaded.');}else toast(result.error);}
});
document.addEventListener('change',e=>{if(e.target.matches('[data-plan-done]')){updateState({...ws(),plans:ws().plans.map(p=>p.id===e.target.dataset.planDone?{...p,done:e.target.checked,updatedAt:now()}:p)},'Plan updated');return;}if(e.target.matches('[data-compare]')){if(e.target.checked){if(compare.size>=3){e.target.checked=false;toast('Compare up to three ideas at a time.');return;}compare.add(e.target.dataset.compare);}else compare.delete(e.target.dataset.compare);render();}});
$('#workspace-switch').addEventListener('click',showData);
$('#import-file').addEventListener('change',async e=>{
  const file=e.target.files[0];e.target.value='';if(!file)return;
  try{if(file.size>25*1024*1024)throw new Error('This file is larger than the 25 MB import limit.');showImportPreview(JSON.parse(await file.text()));}catch(error){toast(`Import failed: ${error.message}`);}
});
window.addEventListener('storage',event=>{if(event.key===storageKey||event.key===null){storageConflict=true;storageError='This workspace changed in another tab. Export your current copy before loading the saved version. Automatic saving is paused to protect both copies.';render();}});
setBackupListener(state=>{backupState=state;paintBackupState();});
getBackupState().then(state=>{backupState=state;paintBackupState();}).catch(()=>{});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&fullscreen&&!document.querySelector('dialog[open]')){fullscreen=false;render();}});
$('#editor-dialog').addEventListener('close',()=>{pendingOrigin=null;});
render();
