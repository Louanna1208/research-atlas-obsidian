import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {adaptApp,adaptModel} from '../src/adapt-app.mjs';
import {guides,fields} from '../src/mentoring.js';
import {createDemoWorkspace} from '../vendor/atlas/model.js';
import {frameDocument} from '../src/frame-document.mjs';

test('the full app retains all view handlers and uses vault storage after adaptation',async()=>{
  const app=adaptApp(await readFile(new URL('../vendor/atlas/app.js',import.meta.url),'utf8'));
  for(const view of ['atlas','home','guide','portfolio','week','reflections'])assert.ok(app.includes(`view==='${view}'`));
  assert.ok(app.includes('previewMerge'));assert.ok(app.includes('applyMerge'));assert.ok(app.includes('fullscreen'));
  assert.ok(!/\blocalStorage\b/.test(app));assert.ok(!app.includes('Request persistent browser storage'));
  assert.ok(app.includes("'atlas-note-selected'"));assert.ok(app.includes('bottleneck'));
});
test('the adapted real model routes save and load through the injected provider',async()=>{
  const source=adaptModel(await readFile(new URL('../vendor/atlas/model.js',import.meta.url),'utf8'));
  let memory=null;const context=vm.createContext({crypto,__atlasStorage:{getItem:()=>memory,setItem:(_,value)=>memory=value}});
  vm.runInContext(source.replace(/^export\s+/gm,'')+'\nglobalThis.api={saveWorkspace,loadWorkspace};',context);
  const data=createDemoWorkspace();context.inputJSON=JSON.stringify(data);
  const result=vm.runInContext('api.saveWorkspace(JSON.parse(inputJSON))',context);assert.equal(result.ok,true,result.error);
  assert.deepEqual(JSON.parse(memory),data);assert.equal(context.api.loadWorkspace().workspace.id,data.id);
});
test('the mentoring path defines all five stages with prompts and caveats',()=>{
  assert.equal(guides['research-path'].steps.length,5);
  for(const key of ['bottleneck','changedConditions','connectionBasis','vaultNote'])assert.ok(fields[key].pitfall);
});
test('embedding preserves JavaScript dollar syntax and contains closing script text',()=>{
  const script="const $$ = value => value; const s = '</script>'; const price = '$&';";
  const html=frameDocument({html:'<html><head></head><body></body></html>',script},'test-token');
  assert.ok(html.includes('const $$'));assert.ok(html.includes("'$&'"));assert.ok(html.includes("'<\\/script>'"));
  assert.equal((html.match(/<\/script>/g)||[]).length,1);
});
