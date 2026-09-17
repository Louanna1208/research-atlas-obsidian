import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=(await readFile(new URL('../src/frame-runtime.js',import.meta.url),'utf8')).split('await ready;')[0];
function runtime(){
  const sent=[],handlers={},parent={postMessage:message=>sent.push(message)};
  const context=vm.createContext({__atlasToken:'one-view',parent,CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
    document:{querySelector:()=>null,createElement:()=>({setAttribute(){}}),addEventListener(){}},
    window:{addEventListener:(type,handler)=>handlers[type]=handler,dispatchEvent(){}},
  });
  vm.runInContext(source,context);
  return {api:context.__atlasHost,storage:context.__atlasStorage,sent,
    receive:(message,from=parent)=>handlers.message({source:from,data:{channel:'research-atlas-v1',token:'one-view',...message}})};
}
test('a frame reports saving until the exact host acknowledges the write',()=>{
  const r=runtime();r.receive({type:'init',raw:null});r.storage.setItem('key','{"data":"pending"}');
  assert.equal(r.api.status('personal',''),'Saving to vault…');assert.equal(r.sent.at(-1).type,'save');
  r.receive({type:'saved',seq:1});assert.equal(r.api.status('personal',''),'Saved in vault');
});
test('unrelated windows and incorrect session tokens cannot initialize or acknowledge a frame',()=>{
  const r=runtime();r.receive({type:'init',raw:'intruder'},{});assert.equal(r.storage.getItem(),null);
  r.receive({type:'init',raw:'intruder',token:'wrong'});assert.equal(r.storage.getItem(),null);
  r.storage.setItem('key','pending');r.receive({type:'saved',seq:1},{});assert.equal(r.api.status('personal',''),'Saving to vault…');
});
test('write failures preserve the open copy, block later writes, and leave export available',()=>{
  const r=runtime();r.receive({type:'init',raw:'old'});r.storage.setItem('key','mine');
  r.receive({type:'save-error',seq:1,error:'Conflict'});assert.equal(r.api.status('personal',''),'Not saved to vault');
  assert.throws(()=>r.storage.setItem('key','newer'),/Conflict/);assert.equal(r.storage.getItem(),'mine');
  r.api.exportFile('recovery.json','mine','application/json');assert.equal(r.sent.at(-1).type,'export');
});
