// Local browser smoke test of the exact embedded frame. This is not an Obsidian host test.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {frameDocument} from '../src/frame-document.mjs';
const frame=JSON.parse(await readFile(new URL('../dist/frame.json',import.meta.url),'utf8'));
const html=`<!doctype html><html><head><meta charset="utf-8"><title>Atlas plugin frame smoke test</title><style>html,body{margin:0;height:100%;font:14px sans-serif}header{height:36px;display:flex;align-items:center;gap:14px;padding:0 12px}iframe{width:100%;height:calc(100% - 36px);border:0}</style></head><body><header>Plugin frame smoke test (simulated vault)<span id="status">Starting</span><button id="reload">Reopen saved copy</button><button id="conflict">Simulate write failure</button></header><iframe title="Research Atlas" sandbox="allow-scripts allow-forms allow-downloads"></iframe><script>
const iframe=document.querySelector('iframe'),status=document.querySelector('#status');let token='preview-session',fail=false;
function post(type,payload={}){iframe.contentWindow.postMessage({channel:'research-atlas-v1',token,type,...payload},'*');}
window.addEventListener('message',e=>{if(e.source!==iframe.contentWindow||e.data?.token!==token)return;const m=e.data;
if(m.type==='ready'){post('init',{raw:localStorage.getItem('atlas-plugin-smoke')});status.textContent='Frame ready';}
if(m.type==='save'){if(fail){post('save-error',{seq:m.seq,error:'Simulated vault conflict'});status.textContent='Save blocked';}else{localStorage.setItem('atlas-plugin-smoke',m.raw);post('saved',{seq:m.seq});status.textContent='Saved '+JSON.parse(m.raw).nodes.length+' records';}}
if(m.type==='export'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([m.text]));a.download=m.name;a.click();status.textContent='Export received: '+m.name;}
if(m.type==='choose-note'){post('note-selected',{nodeId:m.nodeId,path:'Reading/Example.md'});}
if(m.type==='open-note'){status.textContent='Open note: '+m.path;}
if(m.type==='asset'){status.textContent='Agent asset requested: '+m.path;}
});
document.querySelector('#conflict').onclick=()=>{fail=true;status.textContent='Next save will fail';};
document.querySelector('#reload').onclick=()=>location.reload();
iframe.srcdoc=${JSON.stringify(frameDocument(frame,'preview-session')).replace(/</g,String.fromCharCode(92)+'u003c')};
</script></body></html>`;
createServer((req,res)=>{if(req.url!=='/'){res.writeHead(404);res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}).listen(4175,'127.0.0.1',()=>console.log('Plugin frame preview: http://127.0.0.1:4175'));

