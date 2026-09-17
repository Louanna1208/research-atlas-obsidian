import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import * as model from './model.js';
import * as workflow from './workflow-ui.js';
import * as guide from './guide.js';

const [appSource, modelSource] = await Promise.all([
  readFile(new URL('./app.js', import.meta.url), 'utf8'),
  readFile(new URL('./model.js', import.meta.url), 'utf8'),
]);
function importedBindings(module, path) {
  const declaration = [...appSource.matchAll(/^import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/gm)].find(([, , source]) => source === path);
  assert.ok(declaration, `Expected app import: ${path}`);
  return Object.fromEntries(declaration[1].split(',').map(spec => {
    const [name, alias = name] = spec.trim().split(/\s+as\s+/);
    assert.ok(Object.hasOwn(module, name), `Missing export ${name} in ${path}`);
    return [alias, module[name]];
  }));
}

function workspace(name = 'My work') {
  let value = model.createEmptyWorkspace(name);
  value = model.upsertNode(value, model.createNode('problem', { id: 'personal-question', title: 'My original research question' }));
  value = model.upsertNode(value, model.createNode('idea', { id: 'personal-idea', title: 'My original idea' }));
  return model.appendDecision(value, { nodeId: 'personal-question', title: 'Keep thinking', body: 'Preserve my original reasoning.' });
}
function storage(initial = workspace()) {
  let raw = initial === null ? null : typeof initial === 'string' ? initial : JSON.stringify(initial);
  let failWrites = false;
  return {
    getItem() { return raw; },
    setItem(key, value) { assert.equal(key, model.STORAGE_KEY); if (failWrites) throw new Error('Quota exceeded'); raw = value; },
    rejectWrites(value = true) { failWrites = value; },
    get raw() { return raw; },
    get workspace() { return JSON.parse(raw); },
  };
}

/** Execute the real state handlers and model; stub only rendering and browser surfaces. */
function app(store) {
  const events = new Map(), browserEvents = new Map(), elements = new Map();
  const backupWrites = [];
  let conflictInputs = [];
  function element(selector) {
    if (!elements.has(selector)) elements.set(selector, {
      handlers: new Map(), innerHTML: '', hidden: true, value: '',
      addEventListener(type, handler) { this.handlers.set(type, handler); },
      close() {}, showModal() {}, focus() {}, click() {},
      querySelectorAll: selector => selector === '[data-conflict]' ? conflictInputs : [],
      classList: { add() {}, remove() {}, toggle() {} },
    });
    return elements.get(selector);
  }
  const backupStubs = {
    getBackupState: async () => ({ supported: false, status: 'disconnected' }),
    setBackupListener() {},
    queueBackup: async value => { backupWrites.push(JSON.parse(JSON.stringify(value))); },
    connectBackup: async () => {}, resumeBackup: async () => {}, disconnectBackup: async () => {},
    requestDurableStorage: async () => ({ supported: false, persisted: false }),
  };
  const context = vm.createContext({
    ...importedBindings(workflow, './workflow-ui.js'), ...importedBindings(guide, './guide.js'), ...importedBindings(backupStubs, './local-backup.js'),
    document: {
      querySelector: element, querySelectorAll: () => [],
      addEventListener: (type, handler) => events.set(type, handler),
    },
    window: { addEventListener: (type, handler) => browserEvents.set(type, handler), scrollTo() {} },
    localStorage: store,
    crypto: globalThis.crypto,
    URL, Blob, console,
    FormData: class {
      constructor(target) { this.values = target.__formValues || {}; }
      [Symbol.iterator]() { return Object.entries(this.values)[Symbol.iterator](); }
      get(name) { return this.values[name] ?? null; }
      getAll(name) { return Object.hasOwn(this.values, name) ? [this.values[name]] : []; }
    },
    setTimeout() { return 1; }, clearTimeout() {}, requestAnimationFrame() {},
    __confirm: true,
  });
  const importedNames = appSource.match(/import\s*\{([^}]+)\}\s*from\s*['"]\.\/model\.js['"]/)[1];
  const executableModel = modelSource.replace(/^export\s+/gm, '');
  const executableApp = appSource.replace(/^import .*;\r?\n/gm, '').replace(/render\(\);\s*$/, '');
  vm.runInContext(`const {${importedNames}} = (() => {\n${executableModel}\nreturn {${Object.keys(model).join(',')}};\n})();\n${executableApp}\n
    render = () => {};
    showEditor = () => { globalThis.__editorOpened = true; };
    confirmAction = async () => globalThis.__confirm;
    globalThis.__app = {
      snapshot: () => JSON.parse(JSON.stringify({ mode, personal, demo, storageError, pendingImport, search, filter, statusFilter, selectedId, view, activeWeek })),
      add: (nodeId, title) => updateState(upsertNode(ws(), createNode('idea', { id: nodeId, title })), 'Added'),
      setFilters: () => { search='original'; filter='problem'; statusFilter='seed'; view='home'; },
    };
  `, context);
  return {
    snapshot: () => JSON.parse(JSON.stringify(context.__app.snapshot())),
    add: (id, title) => context.__app.add(id, title),
    confirm: value => { context.__confirm = value; },
    editorOpened: () => !!context.__editorOpened,
    backupWrites: () => backupWrites,
    setFilters: () => context.__app.setFilters(),
    async click(dataset) {
      const button = { dataset, hasAttribute: () => false };
      await events.get('click')({ target: { closest: () => button } });
    },
    async importWorkspace(value) {
      const raw = typeof value === 'string' ? value : JSON.stringify(value);
      await element('#import-file').handlers.get('change')({ target: { files: [{ size: Buffer.byteLength(raw), text: async () => raw }], value: '' } });
    },
    async applyImport(mode = 'merge', choices = {}) {
      element('#import-mode').value = mode;
      conflictInputs = Object.entries(choices).map(([key, value]) => ({ dataset: { conflict: key }, value }));
      await element('#import-form').handlers.get('submit')({ preventDefault() {} });
    },
    importWarning: () => element('#import-warning').textContent || '',
    previewHTML: () => element('#import-dialog').innerHTML,
    editorHTML: () => element('#editor-dialog').innerHTML,
    async submitEntry(values) {
      const form = element('#entry-form');
      form.__formValues = values;
      await form.handlers.get('submit')({ target: form, preventDefault() {} });
    },
    storageChanged() { browserEvents.get('storage')?.({ key: model.STORAGE_KEY }); },
  };
}
const ids = value => value.nodes.map(node => node.id);

test('undo restores a deletion in the same workspace, including linked reasoning', async () => {
  const store = storage();
  const page = app(store);
  await page.click({ deleteNode: 'personal-question' });
  assert.ok(!ids(store.workspace).includes('personal-question'));
  assert.equal(store.workspace.decisions[0].nodeId, null);
  await page.click({ action: 'undo' });
  assert.ok(ids(store.workspace).includes('personal-question'));
  assert.equal(store.workspace.decisions[0].nodeId, 'personal-question');
  assert.equal(store.workspace.decisions[0].body, 'Preserve my original reasoning.');
});

test('an example deletion cannot overwrite personal notes after switching workspaces', async () => {
  const store = storage();
  const original = store.raw;
  const page = app(store);
  await page.click({ action: 'demo' });
  await page.click({ deleteNode: page.snapshot().demo.nodes[0].id });
  await page.click({ action: 'personal' });
  await page.click({ action: 'undo' });
  assert.equal(store.raw, original);
  assert.deepEqual(ids(page.snapshot().personal), ['personal-question', 'personal-idea']);
});

test('an old deletion cannot undo a later research edit', async () => {
  const store = storage();
  const page = app(store);
  await page.click({ deleteNode: 'personal-question' });
  page.add('new-thinking', 'A thought captured after the deletion');
  await page.click({ action: 'undo' });
  assert.ok(ids(store.workspace).includes('new-thinking'));
  assert.ok(!ids(store.workspace).includes('personal-question'));
});

test('an old deletion cannot replace an imported workspace', async () => {
  const store = storage();
  const page = app(store);
  await page.click({ deleteNode: 'personal-question' });
  const imported = model.upsertNode(model.createEmptyWorkspace('Restored work'), model.createNode('paper', { id: 'restored-reading', title: 'A reading from my backup' }));
  await page.importWorkspace(imported);
  assert.deepEqual(ids(store.workspace), ['personal-idea'], 'preview must not write the imported data');
  await page.applyImport('replace');
  assert.deepEqual(ids(store.workspace), ['restored-reading']);
  await page.click({ action: 'undo' });
  assert.deepEqual(ids(store.workspace), ['restored-reading']);
  assert.equal(store.workspace.name, 'Restored work');
});

test('a stale tab preserves newer saved notes and keeps its own edits in memory', () => {
  const store = storage();
  const first = app(store), stale = app(store);
  first.add('first-tab', 'New thinking from the first tab');
  stale.storageChanged();
  stale.add('second-tab', 'Unsaved thinking from the second tab');
  assert.ok(ids(store.workspace).includes('first-tab'));
  assert.ok(!ids(store.workspace).includes('second-tab'));
  assert.ok(ids(stale.snapshot().personal).includes('second-tab'));
  assert.match(stale.snapshot().storageError, /another tab|changed|conflict|newer/i);
});

test('a save guard detects stale data even without a storage event while browsing examples', async () => {
  const store = storage();
  const first = app(store), stale = app(store);
  await stale.click({ action: 'demo' });
  first.add('first-tab', 'Saved while the other tab explored the example');
  await stale.click({ action: 'personal' });
  stale.add('second-tab', 'A local thought after returning');
  assert.ok(ids(store.workspace).includes('first-tab'));
  assert.ok(!ids(store.workspace).includes('second-tab'));
  assert.ok(ids(stale.snapshot().personal).includes('second-tab'));
});

test('conflict recovery requires confirmation and resumes saving from the newer copy', async () => {
  const store = storage();
  const first = app(store), stale = app(store);
  first.add('first-tab', 'Newer saved thinking');
  stale.add('unsaved-local', 'A thought to export before recovery');
  stale.confirm(false);
  await stale.click({ action: 'reload-saved' });
  assert.ok(ids(stale.snapshot().personal).includes('unsaved-local'));
  assert.ok(ids(store.workspace).includes('first-tab'));
  stale.confirm(true);
  await stale.click({ action: 'reload-saved' });
  assert.ok(ids(stale.snapshot().personal).includes('first-tab'));
  assert.ok(!ids(stale.snapshot().personal).includes('unsaved-local'));
  stale.add('after-recovery', 'Continue from the saved version');
  assert.ok(ids(store.workspace).includes('first-tab'));
  assert.ok(ids(store.workspace).includes('after-recovery'));
  assert.equal(stale.snapshot().storageError, '');
});

test('corrupt saved content survives example edits and a cancelled fresh start', async () => {
  const corrupt = '{unreadable but recoverable';
  const store = storage(corrupt);
  const page = app(store);
  assert.equal(page.snapshot().mode, 'demo');
  await page.click({ deleteNode: page.snapshot().demo.nodes[0].id });
  page.confirm(false);
  await page.click({ action: 'personal' });
  assert.equal(store.raw, corrupt);
  assert.equal(page.snapshot().personal, null);
});

test('invalid imports never replace personal content', async () => {
  const store = storage();
  const original = store.raw;
  const page = app(store);
  await page.importWorkspace('{not valid JSON');
  assert.equal(store.raw, original);
  const invalid = workspace(); invalid.edges.push({ source: 'missing' });
  await page.importWorkspace(invalid);
  assert.equal(store.raw, original);
});

test('a journal-only workspace opens its own history instead of the example', () => {
  const journal = model.appendReview(model.createEmptyWorkspace('My research journal'), { title: 'Month one', body: 'I learned how to refine a question.' });
  const page = app(storage(journal));
  assert.equal(page.snapshot().mode, 'personal');
  assert.equal(page.snapshot().personal.reviews[0].title, 'Month one');
});

test('starting a brand-new personal workspace persists the empty workspace across reload', async () => {
  const store = storage(null);
  const firstVisit = app(store);
  assert.equal(firstVisit.snapshot().mode, 'demo');
  assert.equal(store.raw, null, 'viewing the example alone must not create personal saved data');
  await firstVisit.click({ action: 'personal' });
  assert.equal(firstVisit.snapshot().mode, 'personal');
  assert.equal(firstVisit.snapshot().storageError, '');
  assert.equal(store.workspace.schemaVersion, 2);
  assert.deepEqual(store.workspace.nodes, []);
  const savedId = store.workspace.id;
  const reloaded = app(store);
  assert.equal(reloaded.snapshot().mode, 'personal');
  assert.equal(reloaded.snapshot().personal.id, savedId);
  assert.deepEqual(reloaded.snapshot().personal.nodes, []);
});

test('opening a selected result preserves the search and filters used to find it', async () => {
  const page = app(storage());
  page.setFilters();
  await page.click({ select: 'personal-question' });
  const state = page.snapshot();
  assert.equal(state.selectedId, 'personal-question');
  assert.equal(state.search, 'original');
  assert.equal(state.filter, 'problem');
  assert.equal(state.statusFilter, 'seed');
});

test('only a successfully saved personal edit queues a file backup', async () => {
  const store = storage();
  const first = app(store), second = app(store);
  first.add('saved', 'Saved and eligible for backup');
  assert.equal(first.backupWrites().length, 1);
  assert.ok(ids(first.backupWrites()[0]).includes('saved'));
  second.add('conflicted', 'Keep in memory while another tab is newer');
  assert.equal(second.backupWrites().length, 0);
  await first.click({ action: 'demo' });
  first.add('example-only', 'Do not copy the example into the personal backup');
  assert.equal(first.backupWrites().length, 1);
});

test('import preview leaves storage unchanged and merging appends without discarding history', async () => {
  const store = storage();
  const original = store.raw;
  const page = app(store);
  const incoming = model.upsertNode(model.createEmptyWorkspace('Memory summary'), model.createNode('paper', { id: 'reading', title: 'An imported historical note', fields: { publishedOn: '1974' } }));
  await page.importWorkspace(incoming);
  assert.equal(store.raw, original);
  assert.equal(page.snapshot().pendingImport.nodes[0].id, 'reading');
  assert.ok(page.previewHTML().includes('Nothing changes until you apply'));
  assert.equal(page.backupWrites().length, 0);
  await page.applyImport();
  assert.deepEqual(ids(store.workspace), ['personal-question', 'personal-idea', 'reading']);
  assert.equal(store.workspace.name, 'My work');
  assert.equal(store.workspace.decisions[0].body, 'Preserve my original reasoning.');
  assert.equal(store.workspace.nodes.find(node => node.id === 'reading').learnedOn, '');
  assert.ok(store.workspace.nodes.find(node => node.id === 'reading').importedAt);
  assert.equal(page.snapshot().pendingImport, null);
  assert.equal(page.backupWrites().length, 1);
  await page.importWorkspace(incoming);
  await page.applyImport();
  assert.equal(store.workspace.nodes.length, 3, 'importing the same stable IDs twice is safe');
});

test('conflicting imported versions cannot save until each choice is explicit', async () => {
  const store = storage();
  const original = store.raw;
  const page = app(store);
  const incoming = structuredClone(store.workspace);
  incoming.nodes[0].body = 'A different interpretation from the agent';
  await page.importWorkspace(incoming);
  assert.ok(page.previewHTML().includes('1 conflicting versions'));
  await page.applyImport();
  assert.equal(store.raw, original);
  assert.match(page.importWarning(), /resolve conflict/);
  assert.equal(page.backupWrites().length, 0);
  await page.applyImport('merge', { 'nodes:personal-question': 'both' });
  assert.equal(store.workspace.nodes.length, 3);
  assert.equal(store.workspace.nodes.find(node => node.id === 'personal-question').body, '');
  const fork = store.workspace.nodes.find(node => node.body === 'A different interpretation from the agent');
  assert.ok(fork && fork.id !== 'personal-question');
  assert.equal(store.workspace.decisions.length, 2, 'the incoming decision branch should follow the forked node');
  assert.ok(store.workspace.decisions.some(decision => decision.nodeId === fork.id));
});

test('replacement remains a separate confirmed action and declining it preserves the workspace', async () => {
  const store = storage();
  const original = store.raw;
  const page = app(store);
  await page.importWorkspace(model.createEmptyWorkspace('Replacement'));
  page.confirm(false);
  await page.applyImport('replace');
  assert.equal(store.raw, original);
  assert.equal(page.snapshot().personal.name, 'My work');
  assert.equal(page.backupWrites().length, 0);
});

test('a save failure during import retains both the current workspace and the pending preview', async () => {
  const store = storage();
  const original = store.raw;
  const page = app(store);
  const incoming = model.upsertNode(model.createEmptyWorkspace(), model.createNode('paper', { id: 'incoming', title: 'A recoverable import' }));
  await page.importWorkspace(incoming);
  store.rejectWrites();
  await page.applyImport();
  assert.equal(store.raw, original);
  assert.deepEqual(ids(page.snapshot().personal), ['personal-question', 'personal-idea']);
  assert.ok(page.snapshot().pendingImport.nodes.some(node => node.id === 'incoming'));
  assert.match(page.importWarning(), /Quota exceeded/);
  assert.equal(page.backupWrites().length, 0);
  store.rejectWrites(false);
  await page.applyImport();
  assert.ok(ids(store.workspace).includes('incoming'));
});

test('a newer browser save blocks an old import preview even without a storage event', async () => {
  const store = storage();
  const first = app(store), stale = app(store);
  const incoming = model.upsertNode(model.createEmptyWorkspace(), model.createNode('paper', { id: 'incoming', title: 'Do not overwrite newer work' }));
  await stale.importWorkspace(incoming);
  first.add('newer', 'New reasoning saved while the preview was open');
  const newer = store.raw;
  await stale.applyImport();
  assert.equal(store.raw, newer);
  assert.match(stale.importWarning(), /changed|latest copy/);
  assert.equal(stale.backupWrites().length, 0);
});

test('the week-navigation actions rendered by the workflow are handled by the app', async () => {
  const page = app(storage());
  const current = page.snapshot().activeWeek;
  const html = workflow.weeklyPage(model.createDemoWorkspace(), current);
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(([, attributes, label]) => ({ attributes, label, action: attributes.match(/data-action="([^"]+)"/)?.[1] }));
  const previous = buttons.find(button => button.attributes.includes('aria-label="Previous week"')).action;
  const next = buttons.find(button => button.attributes.includes('aria-label="Next week"')).action;
  const reset = buttons.find(button => button.label === 'This week').action;
  const previousDate = new Date(`${current}T12:00:00`);
  previousDate.setDate(previousDate.getDate() - 7);
  await page.click({ action: previous });
  assert.equal(page.snapshot().activeWeek, model.weekStart(previousDate));
  await page.click({ action: next });
  assert.equal(page.snapshot().activeWeek, current);
  await page.click({ action: previous });
  await page.click({ action: reset });
  assert.equal(page.snapshot().activeWeek, current);
});

test('editing a historical decision preserves current stage unless its choice is explicitly reapplied', async () => {
  let original = workspace();
  original = model.upsertNode(original, { ...original.nodes[0], status: 'completed', fields: { nextStep: 'Prepare the completed artifact', restart: 'Only if a new measurement becomes available' } });
  original.decisions[0] = { ...original.decisions[0], outcome: 'pause', action: 'Revisit when an informative contrast is found.' };
  const store = storage(original);
  const page = app(store);
  const historical = original.decisions[0];
  await page.click({ editEntry: historical.id, kind: 'decision' });
  assert.match(page.editorHTML(), /name="applyChoice"/);
  assert.doesNotMatch(page.editorHTML(), /name="applyChoice"[^>]*checked/);
  const fields = { title: historical.title, nodeId: historical.nodeId, body: 'Clarified the reason behind this older choice.', before: '', trigger: '', after: '', action: historical.action, outcome: historical.outcome };
  await page.submitEntry(fields);
  assert.equal(store.workspace.nodes[0].status, 'completed');
  assert.equal(store.workspace.nodes[0].fields.nextStep, 'Prepare the completed artifact');
  assert.equal(store.workspace.nodes[0].fields.restart, 'Only if a new measurement becomes available');
  assert.equal(store.workspace.decisions[0].body, fields.body);
  assert.equal(store.workspace.decisions[0].createdAt, historical.createdAt);
  await page.click({ editEntry: historical.id, kind: 'decision' });
  await page.submitEntry({ ...fields, applyChoice: 'on' });
  assert.equal(store.workspace.nodes[0].status, 'paused');
  assert.equal(store.workspace.nodes[0].fields.restart, historical.action);
});
