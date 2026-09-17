import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

// A data URL also works if these static files are copied without package.json.
const source = await readFile(new URL('./model.js', import.meta.url), 'utf8');
const model = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const { STORAGE_KEY, createEmptyWorkspace, createDemoWorkspace, createNode, createEdge, upsertNode, removeNode, upsertEdge, appendDecision, appendReview, filterNodes, validateWorkspace, loadWorkspace, saveWorkspace, weekStart, learnedThisMonth } = model;
function memoryStorage(initial = null) {
  let value = initial;
  return { getItem(key) { assert.equal(key, STORAGE_KEY); return value; }, setItem(key, next) { assert.equal(key, STORAGE_KEY); value = next; }, get value() { return value; } };
}
function populated() {
  let workspace = createEmptyWorkspace();
  workspace = upsertNode(workspace, createNode('problem', { id: 'question', title: 'A research question', body: 'Original thinking', fields: { sourceUrl: 'https://example.org/paper', bottleneck: 'No sequence measurements' } }));
  workspace = upsertNode(workspace, createNode('idea', { id: 'idea', title: 'A possible experiment' }));
  workspace = upsertEdge(workspace, createEdge('idea', 'question', { id: 'connection', relation: 'explores', reason: 'Compare two explanations' }));
  return appendDecision(workspace, { id: 'decision', nodeId: 'question', title: 'Keep the question', body: 'Its importance remains uncertain.' });
}
test('save and load preserve all user content and isolate returned objects', () => {
  const storage = memoryStorage();
  const original = appendReview(populated(), { title: 'A monthly thought', body: 'Do not lose this', period: '2026-09' });
  assert.deepEqual(saveWorkspace(original, storage), { ok: true });
  const loaded = loadWorkspace(storage);
  assert.equal(loaded.error, undefined);
  assert.deepEqual(loaded.workspace, original);
  loaded.workspace.nodes[0].fields.bottleneck = 'Changed';
  assert.equal(original.nodes[0].fields.bottleneck, 'No sequence measurements');
});
test('missing storage starts empty; corrupt saved data remains available for recovery', () => {
  const fresh = memoryStorage();
  assert.equal(loadWorkspace(fresh).workspace.nodes.length, 0);
  assert.equal(fresh.value, null);
  const corrupt = memoryStorage('{broken');
  const result = loadWorkspace(corrupt);
  assert.equal(result.workspace, null);
  assert.match(result.error, /has not been changed/);
  assert.equal(corrupt.value, '{broken');
});
test('storage access and quota failures are surfaced without claiming a save', () => {
  const blocked = { getItem() { throw new Error('Access blocked'); }, setItem() { throw new Error('Quota exceeded'); } };
  assert.match(loadWorkspace(blocked).error, /Access blocked/);
  const result = saveWorkspace(populated(), blocked);
  assert.equal(result.ok, false);
  assert.match(result.error, /Export a copy/);
  assert.match(result.error, /Quota exceeded/);
});
test('failed validation never overwrites a previous workspace', () => {
  const storage = memoryStorage();
  const workspace = populated();
  assert.equal(saveWorkspace(workspace, storage).ok, true);
  const before = storage.value;
  workspace.edges[0].target = 'missing';
  assert.equal(saveWorkspace(workspace, storage).ok, false);
  assert.equal(storage.value, before);
});
test('deleting a node removes incident edges but preserves decision history', () => {
  const original = populated();
  const result = removeNode(original, 'question');
  assert.equal(result.nodes.length, 1);
  assert.equal(result.edges.length, 0);
  assert.equal(result.decisions.length, 1);
  assert.equal(result.decisions[0].nodeId, null);
  assert.equal(result.decisions[0].body, 'Its importance remains uncertain.');
  assert.equal(original.nodes.length, 2);
  assert.equal(original.edges.length, 1);
  assert.equal(original.decisions[0].nodeId, 'question');
});
test('import rejects duplicate ids, dangling references, dates, schema errors and unknown content', () => {
  const mutations = [
    [w => w.nodes.push(structuredClone(w.nodes[0])), /duplicate id/],
    [w => w.edges[0].target = 'missing', /missing node/],
    [w => w.decisions[0].nodeId = 'missing', /missing node/],
    [w => w.nodes[0].createdAt = '2026-02-30T12:00:00.000Z', /invalid calendar/],
    [w => w.schemaVersion = 3, /schema version/],
    [w => delete w.schemaVersion, /schema version/],
    [w => w.notes = 'Content from another application', /unsupported field/],
    [w => w.nodes[0].body = { important: 'data' }, /must be text/],
    [w => w.nodes[0].fields.sourceUrl = 'javascript:alert(1)', /http or https/],
    [w => w.nodes[0].fields.sourceUrl = 'https://user:password@example.org', /without credentials/],
    [w => w.edges[0].target = 'idea', /different nodes/],
  ];
  for (const [mutate, pattern] of mutations) {
    const workspace = populated(); mutate(workspace);
    assert.throws(() => validateWorkspace(workspace), pattern);
  }
});
test('edits retain identity and creation time without mutating their input', () => {
  const original = populated();
  const node = original.nodes[0];
  const result = upsertNode(original, { ...node, title: 'Reframed question', createdAt: '2000-01-01T00:00:00.000Z' });
  assert.equal(result.nodes.length, original.nodes.length);
  assert.equal(result.nodes[0].createdAt, node.createdAt);
  assert.equal(result.nodes[0].title, 'Reframed question');
  assert.equal(original.nodes[0].title, 'A research question');
});
test('search finds the reasoning in fields and connections', () => {
  const workspace = populated();
  assert.deepEqual(filterNodes(workspace, { query: 'sequence measurements' }).map(n => n.id), ['question']);
  assert.equal(filterNodes(workspace, { query: 'two explanations' }).length, 2);
  assert.deepEqual(filterNodes(workspace, { query: 'two explanations', type: 'idea' }).map(n => n.id), ['idea']);
});
test('demo is valid, independent, fictional and never touches browser storage', () => {
  const demo = createDemoWorkspace();
  assert.ok(demo.nodes.length >= 12);
  assert.ok(demo.edges.length >= 15);
  assert.deepEqual(validateWorkspace(demo), demo);
  assert.ok(demo.nodes.filter(n => n.type === 'paper').every(n => /example reading note/i.test(n.body)));
  const another = createDemoWorkspace();
  demo.nodes[0].title = 'Changed demo';
  assert.notEqual(another.nodes[0].title, 'Changed demo');
  const storage = memoryStorage();
  saveWorkspace(populated(), storage);
  const before = storage.value;
  upsertNode(demo, { ...demo.nodes[0], title: 'Experimenting in demo' });
  assert.equal(storage.value, before);
});

test('v1 migration preserves historical content and leaves unknown activity dates empty', () => {
  const legacy = populated();
  legacy.schemaVersion = 1;
  delete legacy.focusIds; delete legacy.plans;
  legacy.nodes.forEach(node => { delete node.eventDate; delete node.learnedOn; delete node.importedAt; });
  legacy.decisions.forEach(entry => { for (const key of ['before', 'trigger', 'after', 'action', 'outcome']) delete entry[key]; });
  const original = JSON.stringify(legacy);
  const storage = memoryStorage(original);
  const loaded = loadWorkspace(storage);
  assert.equal(loaded.migrated, true);
  assert.equal(loaded.workspace.schemaVersion, 2);
  assert.equal(storage.value, original, 'reading a v1 workspace must not write to storage');
  assert.equal(loaded.workspace.nodes[0].body, 'Original thinking');
  assert.equal(loaded.workspace.nodes[0].learnedOn, '');
  assert.equal(loaded.workspace.nodes[0].eventDate, '');
  assert.equal(loaded.workspace.nodes[0].importedAt, '');
  assert.deepEqual(loaded.workspace.focusIds, []);
  assert.deepEqual(loaded.workspace.plans, []);
  assert.equal(loaded.workspace.decisions[0].before, '');
  assert.equal(saveWorkspace(loaded.workspace, storage).ok, true);
  assert.equal(JSON.parse(storage.value).schemaVersion, 2);
});

test('monthly learning uses known learning dates, never ingestion, creation, or publication dates', () => {
  const workspace = createEmptyWorkspace();
  workspace.nodes = [
    createNode('paper', { id: 'historical', title: 'Imported historical source', importedAt: '2026-09-16T00:00:00.000Z', fields: { publishedOn: '1974' } }),
    createNode('paper', { id: 'recent', title: 'Read this month', learnedOn: '2026-09-02', fields: { publishedOn: '1974' } }),
    createNode('paper', { id: 'earlier', title: 'Read earlier', learnedOn: '2026-08-30', importedAt: '2026-09-16T00:00:00.000Z' }),
  ];
  assert.deepEqual(learnedThisMonth(workspace, '2026-09').map(node => node.id), ['recent']);
  assert.throws(() => learnedThisMonth(workspace, '2026-13'), /YYYY-MM/);
});

test('v2 claims, calendar dates, Monday plans, and focus references are validated', () => {
  const workspace = populated();
  workspace.nodes.push(createNode('claim', { id: 'claim', title: 'Candidate explanation', status: 'completed', fields: { claimKind: 'explanation', claimStatus: 'provisional', sourceRef: 'Notebook', sourceVersion: 'v1' }, eventDate: '2024-02-29' }));
  workspace.focusIds = ['question'];
  workspace.plans = [{ id: 'plan', nodeId: 'question', week: '2026-09-14', action: 'Compare predictions', why: 'Resolve ambiguity', outcome: '', done: false, createdAt: workspace.createdAt, updatedAt: workspace.updatedAt }];
  assert.equal(validateWorkspace(workspace).nodes.at(-1).type, 'claim');
  const invalid = [
    [w => w.nodes[0].learnedOn = '2026-02-30', /invalid calendar/],
    [w => w.nodes.at(-1).fields.claimKind = 'mechanism', /must be one of/],
    [w => w.nodes.at(-1).fields.claimStatus = 'truth', /must be one of/],
    [w => w.focusIds = ['missing'], /missing node/],
    [w => w.focusIds = ['question', 'question'], /duplicate/],
    [w => w.plans[0].nodeId = 'missing', /missing node/],
    [w => w.plans[0].week = '2026-09-15', /Monday/],
    [w => w.plans[0].done = 'false', /true or false/],
    [w => w.plans[0].action = '', /cannot be empty/],
  ];
  for (const [mutate, pattern] of invalid) { const draft = structuredClone(workspace); mutate(draft); assert.throws(() => validateWorkspace(draft), pattern); }
  assert.equal(weekStart('2026-09-20'), '2026-09-14');
  assert.equal(weekStart('2026-09-14'), '2026-09-14');
  assert.equal(weekStart('2026-01-01'), '2025-12-29');
});

test('deleting focused and reviewed nodes cleans plans but retains reflection and decision content', () => {
  let workspace = appendReview(populated(), { nodeId: 'question', title: 'Why my view changed', body: 'Keep the reasoning' });
  workspace.focusIds = ['question'];
  workspace.plans = [{ id: 'plan', nodeId: 'question', week: '2026-09-14', action: 'Compare predictions', why: '', outcome: '', done: false, createdAt: workspace.createdAt, updatedAt: workspace.updatedAt }];
  const result = removeNode(workspace, 'question');
  assert.deepEqual(result.focusIds, []);
  assert.deepEqual(result.plans, []);
  assert.equal(result.reviews[0].nodeId, null);
  assert.equal(result.reviews[0].body, 'Keep the reasoning');
  assert.equal(result.decisions[0].nodeId, null);
});

test('the example demonstrates a complete fictional research journey and distinct plan weeks', () => {
  const demo = createDemoWorkspace();
  assert.equal(demo.nodes.length, 24);
  assert.equal(demo.nodes.filter(node => node.type === 'idea').length, 4);
  assert.equal(demo.nodes.filter(node => node.type === 'claim').length, 5);
  assert.equal(demo.nodes.find(node => node.id === 'artifact-checks').status, 'completed');
  assert.equal(demo.focusIds.length, 2);
  assert.equal(demo.plans.filter(plan => plan.week === weekStart()).length, 2);
  assert.ok(demo.plans.some(plan => plan.week !== weekStart()));
  assert.ok(demo.reviews.every(review => demo.nodes.find(node => node.id === review.nodeId)?.type === 'reflection'));
  assert.ok(demo.decisions.every(decision => decision.before && decision.trigger && decision.after && decision.action));
  assert.ok(!learnedThisMonth(demo).some(node => node.id === 'r-classic'));
  assert.ok(learnedThisMonth(demo).some(node => node.id === 'r-method'));
});

test('default monthly review periods follow the user calendar at UTC month boundaries', () => {
  const modelURL = new URL('./model.js', import.meta.url).href;
  for (const [timezone, instant, expected] of [
    ['America/Los_Angeles', '2026-10-01T03:00:00.000Z', '2026-09'],
    ['Asia/Tokyo', '2026-09-30T18:00:00.000Z', '2026-10'],
  ]) {
    const script = `
      const NativeDate = Date;
      globalThis.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [${JSON.stringify(instant)}])); }
      };
      const { createEmptyWorkspace, appendReview } = await import(${JSON.stringify(modelURL)});
      process.stdout.write(appendReview(createEmptyWorkspace()).reviews[0].period);
    `;
    const actual = execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env: { ...process.env, TZ: timezone } });
    assert.equal(actual, expected, timezone);
  }
});
