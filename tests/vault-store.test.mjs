import test from 'node:test';
import assert from 'node:assert/strict';
import {VaultStore,validateFolder} from '../src/vault-store.mjs';
import {createDemoWorkspace} from '../vendor/atlas/model.js';
import {markdownSnapshot} from '../src/markdown.mjs';

function vault(initial={}) {
  const files=new Map(Object.entries(initial));
  const folders=new Set(['Research Atlas']);
  return {
    files, folders, fail:false, beforeProcess:null,
    getAbstractFileByPath(path){return files.has(path)?{path}:folders.has(path)?{path,children:[]}:null;},
    async createFolder(path){if(folders.has(path)||files.has(path))throw new Error('Exists');folders.add(path);},
    async read(file){return files.get(file.path);},
    async create(path,raw){if(this.fail)throw new Error('Disk unavailable');if(files.has(path))throw new Error('Exists');files.set(path,raw);return {path};},
    async process(file,callback){if(this.fail)throw new Error('Disk unavailable');this.beforeProcess?.();const next=callback(files.get(file.path));files.set(file.path,next);},
  };
}
const raw=(name='Original')=>JSON.stringify({...createDemoWorkspace(),name});
test('first save persists the complete workspace without a browser database',async()=>{
  const v=vault(),store=new VaultStore(v,'Research Atlas');assert.equal(await store.load(),null);
  const value=raw();await store.save(value);assert.equal(v.files.get(store.path),value);
  const reopen=new VaultStore(v,'Research Atlas');assert.equal(await reopen.load(),value);
});
test('serialized saves retain the latest revision and one pre-session recovery copy',async()=>{
  const original=raw(),v=vault({'Research Atlas/workspace.json':original});const store=new VaultStore(v,'Research Atlas',()=> 'test');await store.load();
  const a=raw('A'),b=raw('B');await Promise.all([store.save(a),store.save(b)]);
  assert.equal(v.files.get(store.path),b);assert.equal(v.files.get('Research Atlas/Backups/before-session-test.json'),original);
  assert.equal([...v.files.keys()].filter(p=>p.includes('Backups/')).length,1);
});
test('last-moment concurrent change is preserved and saving becomes blocked',async()=>{
  const original=raw(),external=raw('Other device'),v=vault({'Research Atlas/workspace.json':original});const store=new VaultStore(v,'Research Atlas');await store.load();
  v.beforeProcess=()=>v.files.set(store.path,external);
  await assert.rejects(store.save(raw('Mine')),/changed/);assert.equal(v.files.get(store.path),external);
  await assert.rejects(store.save(raw('Later')),/paused/);assert.equal(store.baseline,original);
});
test('two first-open views never overwrite one another',async()=>{
  const v=vault(),a=new VaultStore(v,'Research Atlas'),b=new VaultStore(v,'Research Atlas');await Promise.all([a.load(),b.load()]);
  const first=raw('First');await a.save(first);await assert.rejects(b.save(raw('Second')),/Exists/);assert.equal(v.files.get(a.path),first);
});
test('corrupt files remain available unchanged and cannot be automatically replaced',async()=>{
  const v=vault({'Research Atlas/workspace.json':'{broken'}),store=new VaultStore(v,'Research Atlas');
  await assert.rejects(store.load());assert.equal(store.baseline,'{broken');await assert.rejects(store.save(raw()),/paused/);
  assert.equal(v.files.get(store.path),'{broken');
});
test('failed disk writes never advance the saved baseline',async()=>{
  const original=raw(),v=vault({'Research Atlas/workspace.json':original}),store=new VaultStore(v,'Research Atlas');await store.load();v.fail=true;
  await assert.rejects(store.save(raw('New')),/Disk/);assert.equal(store.baseline,original);assert.equal(v.files.get(store.path),original);
});
test('invalid workspaces and unsafe folders cannot write content',async()=>{
  for(const path of ['../outside','/absolute','C:/outside','.obsidian','Notes/../escape','Notes/.secret',''])assert.throws(()=>validateFolder(path));
  const v=vault(),store=new VaultStore(v,'Research Atlas');await store.load();await assert.rejects(store.save('{"nodes":[]}'));
  assert.equal(v.files.size,0);
});
test('Markdown snapshots include all node types, reasons, history and a lossless JSON round trip',()=>{
  const data=createDemoWorkspace(),files=markdownSnapshot(data),json=files.find(f=>f.name==='workspace.json');
  assert.deepEqual(JSON.parse(json.text),data);assert.equal(files.length,data.nodes.length+2);
  for(const n of data.nodes){const page=files.find(f=>f.text.includes(`atlas_id: ${JSON.stringify(n.id)}`));assert.ok(page);assert.ok(page.text.includes(n.body));}
  const combined=files.filter(f=>f.name.endsWith('.md')).map(f=>f.text).join('\n');
  for(const edge of data.edges)assert.ok(combined.includes(edge.reason));
  for(const decision of data.decisions)assert.ok(combined.includes(decision.title));
  for(const review of data.reviews)assert.ok(combined.includes(review.body));
  for(const plan of data.plans)assert.ok(combined.includes(plan.action));
});
