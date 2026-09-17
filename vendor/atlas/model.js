/** Research Atlas data model. All workspace content belongs to its user. */
export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'research-atlas.workspace.v1';
export const TYPES = Object.freeze({
  problem: { label: 'Problem', color: 'blue', description: 'A question worth returning to' },
  idea: { label: 'Idea', color: 'amber', description: 'A possible way forward' },
  paper: { label: 'Reading', color: 'violet', description: 'A source and your interpretation' },
  capability: { label: 'Capability', color: 'green', description: 'What you can do, with evidence' },
  resource: { label: 'Resource', color: 'cyan', description: 'Data, tools, or conditions you can access' },
  project: { label: 'Project', color: 'coral', description: 'An attempt to learn or find something out' },
  reflection: { label: 'Reflection', color: 'rose', description: 'How your understanding changed' },
  person: { label: 'Person', color: 'slate', description: 'A person and their research context' },
  claim: { label: 'Claim', color: 'indigo', description: 'An observation, explanation, prediction, or limitation' },
});
export const STATUS = Object.freeze(['seed', 'exploring', 'active', 'paused', 'completed', 'archived']);
export const STATUSES = STATUS;
export const EDGE_STATUS = Object.freeze(['confirmed', 'suggested']);
const now = () => new Date().toISOString();
const id = prefix => `${prefix}_${globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
const MAX_TEXT = 30000;
const RESERVED = new Set(['__proto__', 'prototype', 'constructor']);
function fail(path, message) { throw new Error(`${path}: ${message}`); }
function record(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object');
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) fail(path, 'must be a plain object');
  return value;
}
function keys(value, allowed, path) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(path, `unsupported field “${key}”; no content was imported`);
}
function string(value, path, max = MAX_TEXT, required = false) {
  if (typeof value !== 'string') fail(path, 'must be text');
  if (value.length > max) fail(path, `must be at most ${max.toLocaleString()} characters`);
  if (required && !value.trim()) fail(path, 'cannot be empty');
  return value;
}
function identifier(value, path) { return string(value, path, 200, true); }
function date(value, path) {
  string(value, path, 100, true);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) || Number.isNaN(Date.parse(value))) fail(path, 'must be a valid UTC ISO date');
  const normalized = new Date(value).toISOString();
  if (normalized.slice(0, 19) !== value.slice(0, 19)) fail(path, 'contains an invalid calendar date');
  return normalized;
}
function calendarDate(value, path) {
  const result = string(value ?? '', path, 10);
  if (!result) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) fail(path, 'must be YYYY-MM-DD or empty when unknown');
  date(`${result}T00:00:00.000Z`, path);
  return result;
}
function optionalDate(value, path) { return value == null || value === '' ? '' : date(value, path); }
function localDay(value) { return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`; }
/** Monday in the caller's local calendar; date-only strings stay in that calendar. */
export function weekStart(value = new Date()) {
  const current = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${calendarDate(value, 'Date')}T12:00:00`) : new Date(value);
  if (Number.isNaN(current.getTime())) fail('Date', 'must be valid');
  current.setDate(current.getDate() - (current.getDay() + 6) % 7);
  return localDay(current);
}
function array(value, path, max) {
  if (!Array.isArray(value)) fail(path, 'must be a list');
  if (value.length > max) fail(path, `exceeds the limit of ${max.toLocaleString()} items`);
  return value;
}
function option(value, choices, path) {
  if (!choices.includes(value)) fail(path, `must be one of ${choices.join(', ')}`);
  return value;
}
function sourceUrl(value, path) {
  const text = string(value, path, 4000);
  if (!text.trim()) return text;
  let parsed;
  try { parsed = new URL(text); } catch { fail(path, 'must be a complete http or https URL'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) fail(path, 'must be an http or https URL without credentials');
  return text;
}
function unique(items, path) {
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) fail(path, `duplicate id “${item.id}”`);
    ids.add(item.id);
  }
  return ids;
}
function normalizedNode(input, path) {
  const value = record(input, path);
  keys(value, ['id', 'type', 'title', 'body', 'status', 'tags', 'fields', 'createdAt', 'updatedAt', 'eventDate', 'learnedOn', 'importedAt'], path);
  const fields = record(value.fields ?? {}, `${path}.fields`);
  if (Object.keys(fields).length > 100) fail(`${path}.fields`, 'exceeds the limit of 100 fields');
  const safeFields = {};
  for (const [key, field] of Object.entries(fields)) {
    if (RESERVED.has(key)) fail(`${path}.fields`, `unsupported field name “${key}”`);
    string(key, `${path}.fields key`, 100, true);
    safeFields[key] = /url$/i.test(key) ? sourceUrl(field, `${path}.fields.${key}`) : string(field, `${path}.fields.${key}`);
  }
  if (value.type === 'claim') {
    if (safeFields.claimKind) option(safeFields.claimKind, ['observation', 'explanation', 'prediction', 'limitation'], `${path}.fields.claimKind`);
    if (safeFields.claimStatus) option(safeFields.claimStatus, ['provisional', 'supported', 'challenged'], `${path}.fields.claimStatus`);
  }
  return {
    id: identifier(value.id, `${path}.id`),
    type: option(value.type, Object.keys(TYPES), `${path}.type`),
    title: string(value.title, `${path}.title`, 500, true),
    body: string(value.body ?? '', `${path}.body`),
    status: option(value.status ?? 'seed', STATUS, `${path}.status`),
    tags: array(value.tags ?? [], `${path}.tags`, 100).map((tag, i) => string(tag, `${path}.tags[${i}]`, 100, true)),
    fields: safeFields,
    eventDate: calendarDate(value.eventDate, `${path}.eventDate`),
    learnedOn: calendarDate(value.learnedOn, `${path}.learnedOn`),
    importedAt: optionalDate(value.importedAt, `${path}.importedAt`),
    createdAt: date(value.createdAt, `${path}.createdAt`),
    updatedAt: date(value.updatedAt, `${path}.updatedAt`),
  };
}
function normalizedEdge(input, path, nodeIds) {
  const value = record(input, path);
  keys(value, ['id', 'source', 'target', 'relation', 'reason', 'status', 'createdAt', 'updatedAt'], path);
  const source = identifier(value.source, `${path}.source`);
  const target = identifier(value.target, `${path}.target`);
  if (!nodeIds.has(source) || !nodeIds.has(target)) fail(path, 'references a missing node');
  if (source === target) fail(path, 'must connect two different nodes');
  return {
    id: identifier(value.id, `${path}.id`), source, target,
    relation: string(value.relation, `${path}.relation`, 200, true),
    reason: string(value.reason ?? '', `${path}.reason`),
    status: option(value.status ?? 'confirmed', EDGE_STATUS, `${path}.status`),
    createdAt: date(value.createdAt, `${path}.createdAt`),
    updatedAt: date(value.updatedAt, `${path}.updatedAt`),
  };
}

/** Validates a complete import before returning an independent normalized copy. */
export function validateWorkspace(input) {
  const value = record(input, 'Workspace');
  keys(value, ['schemaVersion', 'id', 'name', 'nodes', 'edges', 'decisions', 'reviews', 'plans', 'focusIds', 'createdAt', 'updatedAt'], 'Workspace');
  if (![1, SCHEMA_VERSION].includes(value.schemaVersion)) fail('Workspace.schemaVersion', `unsupported or missing schema version (expected 1 or ${SCHEMA_VERSION})`);
  const nodes = array(value.nodes, 'Workspace.nodes', 5000).map((node, i) => normalizedNode(node, `Node ${i + 1}`));
  const nodeIds = unique(nodes, 'Workspace.nodes');
  const edges = array(value.edges, 'Workspace.edges', 15000).map((edge, i) => normalizedEdge(edge, `Connection ${i + 1}`, nodeIds));
  unique(edges, 'Workspace.edges');
  const decisions = array(value.decisions ?? [], 'Workspace.decisions', 10000).map((entry, i) => {
    const path = `Decision ${i + 1}`;
    record(entry, path);
    keys(entry, ['id', 'nodeId', 'title', 'body', 'createdAt', 'before', 'trigger', 'after', 'action', 'outcome'], path);
    const nodeId = entry.nodeId == null ? null : identifier(entry.nodeId, `${path}.nodeId`);
    if (nodeId && !nodeIds.has(nodeId)) fail(path, 'references a missing node');
    return { id: identifier(entry.id, `${path}.id`), nodeId, title: string(entry.title, `${path}.title`, 500, true), body: string(entry.body ?? '', `${path}.body`), before: string(entry.before ?? '', `${path}.before`), trigger: string(entry.trigger ?? '', `${path}.trigger`), after: string(entry.after ?? '', `${path}.after`), action: string(entry.action ?? '', `${path}.action`), outcome: option(entry.outcome ?? '', ['', 'proceed', 'evidence', 'pause', 'drop'], `${path}.outcome`), createdAt: date(entry.createdAt, `${path}.createdAt`) };
  });
  unique(decisions, 'Workspace.decisions');
  const reviews = array(value.reviews ?? [], 'Workspace.reviews', 2000).map((entry, i) => {
    const path = `Review ${i + 1}`;
    record(entry, path);
    keys(entry, ['id', 'nodeId', 'period', 'title', 'body', 'createdAt'], path);
    const nodeId = entry.nodeId == null ? null : identifier(entry.nodeId, `${path}.nodeId`);
    if (nodeId && !nodeIds.has(nodeId)) fail(path, 'references a missing node');
    return { id: identifier(entry.id, `${path}.id`), nodeId, period: string(entry.period ?? '', `${path}.period`, 100), title: string(entry.title, `${path}.title`, 500, true), body: string(entry.body ?? '', `${path}.body`), createdAt: date(entry.createdAt, `${path}.createdAt`) };
  });
  unique(reviews, 'Workspace.reviews');
  const focusIds = array(value.focusIds ?? [], 'Workspace.focusIds', 5000).map((entry, i) => identifier(entry, `Workspace.focusIds[${i}]`));
  if (new Set(focusIds).size !== focusIds.length) fail('Workspace.focusIds', 'contains duplicate ids');
  for (const nodeId of focusIds) if (!nodeIds.has(nodeId)) fail('Workspace.focusIds', 'references a missing node');
  const plans = array(value.plans ?? [], 'Workspace.plans', 10000).map((entry, i) => {
    const path = `Plan ${i + 1}`;
    record(entry, path);
    keys(entry, ['id', 'nodeId', 'week', 'action', 'why', 'outcome', 'done', 'createdAt', 'updatedAt'], path);
    const nodeId = identifier(entry.nodeId, `${path}.nodeId`);
    if (!nodeIds.has(nodeId)) fail(path, 'references a missing node');
    const week = calendarDate(entry.week, `${path}.week`);
    if (!week || weekStart(week) !== week) fail(`${path}.week`, 'must be a Monday in YYYY-MM-DD format');
    if (typeof entry.done !== 'boolean') fail(`${path}.done`, 'must be true or false');
    return { id: identifier(entry.id, `${path}.id`), nodeId, week, action: string(entry.action, `${path}.action`, MAX_TEXT, true), why: string(entry.why ?? '', `${path}.why`), outcome: string(entry.outcome ?? '', `${path}.outcome`), done: entry.done, createdAt: date(entry.createdAt, `${path}.createdAt`), updatedAt: date(entry.updatedAt, `${path}.updatedAt`) };
  });
  unique(plans, 'Workspace.plans');
  return {
    schemaVersion: SCHEMA_VERSION,
    id: identifier(value.id, 'Workspace.id'),
    name: string(value.name, 'Workspace.name', 500, true),
    nodes, edges, decisions, reviews, focusIds, plans,
    createdAt: date(value.createdAt, 'Workspace.createdAt'),
    updatedAt: date(value.updatedAt, 'Workspace.updatedAt'),
  };
}
export function createEmptyWorkspace(name = 'My research atlas') {
  const timestamp = now();
  return { schemaVersion: SCHEMA_VERSION, id: id('workspace'), name, nodes: [], edges: [], decisions: [], reviews: [], focusIds: [], plans: [], createdAt: timestamp, updatedAt: timestamp };
}
export function createNode(type, values = {}) {
  option(type, Object.keys(TYPES), 'Node.type');
  const timestamp = now();
  return normalizedNode({ id: id('node'), type, title: `Untitled ${TYPES[type].label.toLowerCase()}`, body: '', status: 'seed', tags: [], fields: {}, createdAt: timestamp, updatedAt: timestamp, ...values, type }, 'Node');
}
export function createEdge(source, target, values = {}) {
  if (source && typeof source === 'object') { values = source; source = values.source; target = values.target; }
  const timestamp = now();
  return normalizedEdge({ id: id('edge'), source, target, relation: 'relates to', reason: '', status: 'confirmed', createdAt: timestamp, updatedAt: timestamp, ...values }, 'Connection', new Set([source, target]));
}
function changed(workspace, changes) { return validateWorkspace({ ...workspace, ...changes, updatedAt: now() }); }
export function upsertNode(workspace, node) {
  const existing = workspace.nodes.find(item => item.id === node.id);
  const next = normalizedNode({ ...node, createdAt: existing?.createdAt ?? node.createdAt, updatedAt: now() }, 'Node');
  const nodes = existing ? workspace.nodes.map(item => item.id === next.id ? next : item) : [...workspace.nodes, next];
  return changed(workspace, { nodes });
}
export function removeNode(workspace, nodeId) {
  return changed(workspace, {
    nodes: workspace.nodes.filter(node => node.id !== nodeId),
    edges: workspace.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId),
    decisions: workspace.decisions.map(decision => decision.nodeId === nodeId ? { ...decision, nodeId: null } : decision),
    reviews: (workspace.reviews ?? []).map(review => review.nodeId === nodeId ? { ...review, nodeId: null } : review),
    focusIds: (workspace.focusIds ?? []).filter(entry => entry !== nodeId),
    plans: (workspace.plans ?? []).filter(plan => plan.nodeId !== nodeId),
  });
}
export function upsertEdge(workspace, edge) {
  const existing = workspace.edges.find(item => item.id === edge.id);
  const next = { ...edge, createdAt: existing?.createdAt ?? edge.createdAt, updatedAt: now() };
  return changed(workspace, { edges: existing ? workspace.edges.map(item => item.id === next.id ? next : item) : [...workspace.edges, next] });
}
export function removeEdge(workspace, edgeId) { return changed(workspace, { edges: workspace.edges.filter(edge => edge.id !== edgeId) }); }
export function appendDecision(workspace, values = {}) {
  const entry = { id: id('decision'), nodeId: null, title: 'Research decision', body: '', createdAt: now(), ...values };
  return changed(workspace, { decisions: [...workspace.decisions, entry] });
}
export function appendReview(workspace, values = {}) {
  const entry = { id: id('review'), period: localDay(new Date()).slice(0, 7), title: 'Monthly reflection', body: '', createdAt: now(), ...values };
  return changed(workspace, { reviews: [...workspace.reviews, entry] });
}
/** Search includes personal interpretations and connection reasons, not just titles. */
export function filterNodes(workspace, { query = '', type = 'all', status = 'all', tag = '' } = {}) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return workspace.nodes.filter(node => {
    if (type !== 'all' && node.type !== type) return false;
    if (status !== 'all' && node.status !== status) return false;
    if (tag && !node.tags.includes(tag)) return false;
    if (!terms.length) return true;
    const edges = workspace.edges.filter(edge => edge.source === node.id || edge.target === node.id);
    const haystack = [node.title, node.body, node.type, node.status, ...node.tags, ...Object.values(node.fields), ...edges.map(edge => `${edge.relation} ${edge.reason}`)].join(' ').toLocaleLowerCase();
    return terms.every(term => haystack.includes(term));
  });
}
/** A source is new knowledge only when the user actually dates reading/learning it. */
export function learnedThisMonth(workspace, period = localDay(new Date()).slice(0, 7)) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) fail('Period', 'must be YYYY-MM');
  return workspace.nodes.filter(node => node.learnedOn && node.learnedOn.slice(0, 7) === period);
}

const COLLECTIONS = ['nodes', 'edges', 'decisions', 'reviews', 'plans'];
const AUDIT_FIELDS = new Set(['id', 'createdAt', 'updatedAt', 'importedAt']);
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function content(entry) { return Object.fromEntries(Object.entries(entry).filter(([key]) => !AUDIT_FIELDS.has(key))); }
function changedFields(current, incoming) {
  return [...new Set([...Object.keys(current), ...Object.keys(incoming)])].filter(key => !AUDIT_FIELDS.has(key) && stable(current[key]) !== stable(incoming[key]));
}
function same(current, incoming) { return stable(content(current)) === stable(content(incoming)); }
function entryTitle(entry) { return entry.title || entry.action || entry.relation || entry.id; }
function titleKey(title) { return title.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }

/** Read-only conflict preview. Stable ids, not titles, determine identity. */
export function previewMerge(currentInput, incomingInput) {
  const current = validateWorkspace(currentInput);
  const incoming = validateWorkspace(incomingInput);
  const additions = {}, unchanged = {}, conflicts = [];
  for (const collection of COLLECTIONS) {
    additions[collection] = 0;
    unchanged[collection] = 0;
    const existing = new Map(current[collection].map(entry => [entry.id, entry]));
    for (const entry of incoming[collection]) {
      const previous = existing.get(entry.id);
      if (!previous) additions[collection]++;
      else if (same(previous, entry)) unchanged[collection]++;
      else conflicts.push({ key: `${collection}:${entry.id}`, collection, id: entry.id, title: entryTitle(entry), current: previous, incoming: entry, changedFields: changedFields(previous, entry) });
    }
  }
  const possibleDuplicates = [];
  const byTitle = new Map();
  for (const node of current.nodes) {
    const key = `${node.type}:${titleKey(node.title)}`;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(node);
  }
  for (const node of incoming.nodes) {
    for (const existing of byTitle.get(`${node.type}:${titleKey(node.title)}`) ?? []) {
      if (existing.id !== node.id) possibleDuplicates.push({ existingId: existing.id, incomingId: node.id, title: node.title });
    }
  }
  return { incoming, additions, unchanged, conflicts, possibleDuplicates };
}
function hashText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36);
}
function forkId(entry, existing) {
  const stem = `${entry.id.slice(0, 150)}~import-${hashText(stable(content(entry)))}`;
  let candidate = stem, suffix = 2;
  while (existing.has(candidate) && !same(existing.get(candidate), entry)) candidate = `${stem}-${suffix++}`;
  return candidate;
}
/**
 * Apply an explicitly resolved merge without touching either input or storage.
 * Keeping both a node and its incoming branch also forks unchanged linked records
 * when needed, so existing decision history never moves to a different node.
 */
export function applyMerge(currentInput, incomingInput, choices = {}) {
  const current = validateWorkspace(currentInput);
  const preview = previewMerge(current, incomingInput);
  record(choices, 'Merge choices');
  for (const [key, choice] of Object.entries(choices)) {
    if (RESERVED.has(key)) fail('Merge choices', 'contains an unsupported key');
    option(choice, ['keep', 'incoming', 'both'], `Merge choice ${key}`);
  }
  for (const conflict of preview.conflicts) {
    if (!Object.hasOwn(choices, conflict.key)) fail('Merge', `resolve conflict “${conflict.title}” before importing`);
  }
  const timestamp = now();
  const incoming = preview.incoming;
  const result = { ...current };
  const nodeRemap = new Map();
  const conflictKeys = new Set(preview.conflicts.map(conflict => conflict.key));
  for (const collection of COLLECTIONS) {
    const entries = new Map(current[collection].map(entry => [entry.id, entry]));
    for (const original of incoming[collection]) {
      const entry = { ...original };
      if (collection === 'edges') {
        entry.source = nodeRemap.get(entry.source) ?? entry.source;
        entry.target = nodeRemap.get(entry.target) ?? entry.target;
      } else if ('nodeId' in entry && entry.nodeId) entry.nodeId = nodeRemap.get(entry.nodeId) ?? entry.nodeId;
      const previous = entries.get(original.id);
      const key = `${collection}:${original.id}`;
      const conflict = conflictKeys.has(key);
      const choice = conflict ? choices[key] : undefined;
      if (choice === 'keep') continue;
      // References may change after a node is kept twice, even if this entry was
      // unchanged in the preview. Preserve the existing branch and add the new one.
      if (previous && (choice === 'both' || (!conflict && !same(previous, entry)))) {
        entry.id = forkId(entry, entries);
        if (collection === 'nodes') nodeRemap.set(original.id, entry.id);
        if (entries.has(entry.id)) continue;
      } else if (previous && same(previous, entry)) continue;
      else if (previous) entry.createdAt = previous.createdAt;
      if (collection === 'nodes') entry.importedAt = timestamp;
      entries.set(entry.id, entry);
    }
    result[collection] = [...entries.values()];
  }
  result.focusIds = [...new Set([...current.focusIds, ...incoming.focusIds.map(nodeId => nodeRemap.get(nodeId) ?? nodeId)])];
  result.updatedAt = timestamp;
  return validateWorkspace(result);
}
/** Corrupt storage is retained for recovery; callers must not auto-save an empty replacement. */
export function loadWorkspace(storage) {
  try {
    const provider = storage ?? globalThis.localStorage;
    if (!provider) throw new Error('Browser storage is unavailable. You can still use an exported workspace file.');
    const raw = provider.getItem(STORAGE_KEY);
    if (raw === null) return { workspace: createEmptyWorkspace() };
    if (raw.length > 25_000_000) throw new Error('Saved workspace exceeds the 25 MB import limit.');
    const parsed = JSON.parse(raw);
    return { workspace: validateWorkspace(parsed), migrated: parsed.schemaVersion !== SCHEMA_VERSION };
  } catch (error) { return { workspace: null, error: `Could not load your saved atlas. The saved data has not been changed. ${error.message}` }; }
}
export function saveWorkspace(workspace, storage) {
  try {
    const serialized = JSON.stringify(validateWorkspace(workspace));
    if (serialized.length > 25_000_000) throw new Error('Workspace exceeds the 25 MB export limit.');
    const provider = storage ?? globalThis.localStorage;
    if (!provider) throw new Error('Browser storage is unavailable.');
    provider.setItem(STORAGE_KEY, serialized);
    return { ok: true };
  } catch (error) { return { ok: false, error: `Your changes could not be saved in this browser. Export a copy to keep them. ${error.message}` }; }
}

/** Fictional examples: thinking prompts, not research findings or citations. */
export function createDemoWorkspace() {
  const workspace = createEmptyWorkspace('The learning lab · example atlas');
  const base = new Date();
  const stamp = days => new Date(base.getTime() - days * 86400000).toISOString();
  const day = days => localDay(new Date(base.getTime() - days * 86400000));
  const example = (key, type, title, days, values = {}) => createNode(type, { id: key, title, createdAt: stamp(days), updatedAt: stamp(Math.max(0, days - 2)), eventDate: day(days), ...values });
  workspace.nodes = [
    example('p-generalize', 'problem', 'When does a learned strategy travel?', 48, { status: 'exploring', tags: ['learning', 'generalization'], body: 'Example question: people may solve two tasks with a shared structure yet fail to reuse a strategy. What changes when that structure becomes visible?', fields: { why: 'Understanding the boundary could help distinguish remembering a solution from recognizing when to use it.', uncertainty: 'The two tasks may not be equally difficult. A change in performance alone would not distinguish the explanations.', nextStep: 'Write down two competing explanations and one observation that would separate them.' } }),
    example('p-measure', 'problem', 'Can one score hide different strategies?', 35, { status: 'seed', tags: ['measurement', 'strategies'], body: 'Example question: two people can achieve the same accuracy through different paths. What could we measure to make the difference visible?', fields: { uncertainty: 'Which observable behavior distinguishes strategies without assuming the answer?', nextStep: 'Sketch a task with identical outcomes but visibly different action sequences.' } }),
    example('i-cue', 'idea', 'Give the structure a small visual cue', 12, { status: 'active', tags: ['learning', 'pilot'], body: 'Compare a shared visual cue with an equally noticeable unrelated cue. Treat this as a design idea to examine, not an established effect.', fields: { why: 'It makes one possible explanation of strategy reuse more concrete.', trigger: 'Revisiting the generalization question after learning to build browser tasks.', audience: 'Researchers asking how people recognize a familiar problem in a new setting.', advantage: 'A small browser task is within reach; no special data access is assumed.', uncertainty: 'The cue may simply increase attention.', nextStep: 'Draw the conditions, then ask a peer to identify alternative explanations.', learning: 'Practice translating a verbal explanation into contrasting predictions.' } }),
    example('i-path', 'idea', 'Compare paths, not only final answers', 20, { status: 'paused', tags: ['measurement', 'sequences'], body: 'Keep the sequence of actions in a simple task, then ask whether candidate strategies predict different paths.', fields: { why: 'The same endpoint may conceal different processes.', uncertainty: 'I do not yet know if the strategies make distinguishable predictions.', restart: 'Return after a small simulation shows that the strategies can be separated.', nextStep: 'Write two minimal simulated strategies.', audience: 'Researchers studying strategy differences.', advantage: 'The simulated example can be checked before collecting participant data.' } }),
    example('r-classic', 'paper', 'An older question worth keeping', 0, { status: 'exploring', eventDate: '', learnedOn: '', importedAt: stamp(0), tags: ['reading', 'learning'], body: 'Example reading note for a fictional historical source, not a real citation. This old note was imported today; the date it was first read is unknown. It should never appear as newly learned knowledge merely because it was imported.', fields: { publishedOn: '1974', question: 'What determines whether earlier experience helps on a different problem?', evidence: 'The fictional author describes success on the first task and failure to reuse a strategy on a second. This alone does not identify the reason.', why: 'Keep the unresolved problem even if the original method is no longer useful.', uncertainty: 'Did people fail to recognize the shared structure, or did the second task demand a different strategy?', bottleneck: 'Final accuracy did not reveal the sequence of intermediate decisions.', nextStep: 'Connect this question to a measurement that can distinguish the candidate strategies.', sourceUrl: '' } }),
    example('r-method', 'paper', 'A new method for observing sequences', 0, { status: 'exploring', learnedOn: day(0), tags: ['reading', 'sequences'], body: 'Example reading note for a fictional methods source, not a real citation. Record both what the method measures and the assumptions it needs before connecting it to an old question.', fields: { publishedOn: '2026', question: 'Could an action sequence tell us something that the outcome alone cannot?', evidence: 'In this invented method sketch, intermediate actions can be logged and compared with simulated strategies.', uncertainty: 'Different internal strategies can still produce the same observed sequence; recording more data does not guarantee identification.', why: 'A possible way to revisit the old measurement bottleneck.', nextStep: 'Try it on synthetic sequences where the generating strategy is known.' } }),
    example('c-task', 'capability', 'Build and inspect a small browser task', 30, { status: 'active', tags: ['experiments', 'javascript'], body: 'Example capability statement: implement event logging and inspect whether the intended conditions are presented. In this fictional journey the researcher adapted an existing scaffold rather than building the infrastructure alone.', fields: { evidence: 'The completed logging-check artifact below demonstrates a limited skill: creating a reproducible event log. It does not demonstrate the validity of the scientific measurement.', contribution: 'Adapted the interface and wrote the logging checks. The scaffold came from a shared lab resource.', uncertainty: 'Timing across devices and recovery after interruption remain untested.', learning: 'Next: learn to log timing and handle interrupted sessions.' } }),
    example('c-sim', 'capability', 'Use simulation to test a design', 16, { status: 'exploring', tags: ['simulation', 'methods'], body: 'A developing capability: simulate candidate strategies before committing to data collection.', fields: { evidence: 'Add a checked simulation with known inputs and interpretable outputs.', learning: 'Learn when distinct theories become observationally indistinguishable.' } }),
    example('res-template', 'resource', 'A reusable task scaffold', 24, { status: 'active', tags: ['experiments', 'tools'], body: 'Example resource: a small, documented task template that can be adapted. Record access and limitations when adding a real resource.', fields: { uncertainty: 'Check whether it supports the measurements the design needs.', sourceUrl: '' } }),
    example('proj-pilot', 'project', 'A one-week cue pilot', 6, { status: 'active', tags: ['pilot', 'learning'], body: 'Fictional pilot: the current decision is whether the planned comparison can distinguish recognition of structure from general attention. The toy observations below are for learning this tool; no participant study or real finding is claimed.', fields: { why: 'When does making shared structure visible help people reuse a strategy?', question: 'Would the proposed conditions isolate recognition of structure?', explanation: 'Recognition account: the cue reveals a reusable relation. Attention account: any noticeable cue changes engagement.', evidence: 'A toy walkthrough found changes under both cue variants; the event logger also missed one intermediate action. Neither observation establishes a mechanism.', gap: 'The proposed accounts do not yet make clearly different predictions for the planned outcome.', uncertainty: 'A cue can influence attention as well as recognition.', nextStep: 'Sketch a condition where the candidate accounts predict different action sequences; check the simulated log before collecting data.', prediction: 'A relation-specific account predicts a particular sequence only for the structure cue. A general-attention account must specify its own predicted sequence before this is a discriminating test.', learning: 'Practice designing a discriminating comparison.', contribution: 'The researcher adapted the task and wrote the logging checks; a fictional peer critiqued the controls.', restart: 'If the accounts remain observationally equivalent, pause data collection and refine the measurement.' } }),
    example('ref-question', 'reflection', 'A smaller attempt can answer a better question', 4, { status: 'active', tags: ['research judgment'], body: 'Example reflection: I started with a broad study plan. Writing the competing predictions revealed that the control condition needs more thought. The next useful step is a design walkthrough.', fields: { trigger: 'Preparing the cue pilot discussion.', nextStep: 'Write what each possible result would and would not imply.' } }),
    example('person-peer', 'person', 'A peer with complementary methods', 18, { status: 'exploring', tags: ['collaboration'], body: 'Fictional collaborator placeholder. Use your own workspace for real people and private meeting notes.', fields: { contribution: 'Could help critique the simulation assumptions; this is an example, not a commitment.', nextStep: 'Prepare a specific question that their experience could help answer.' } }),
    example('p-robust', 'problem', 'When is a successful result specific to one task?', 52, { status: 'seed', tags: ['generalization', 'measurement'], body: 'Fictional long-term problem: an effect in one implementation might depend on details of that implementation. Keep the scientific question separate from a plan to collect more tasks.', fields: { why: 'Knowing the boundary can make an explanation more useful for prediction.', uncertainty: 'Which task differences should matter according to the explanation?', nextStep: 'List two features that the account predicts should preserve the effect and one that should change it.', restart: 'Revisit after the first task has a clearly interpretable contrast.' } }),
    example('i-delay', 'idea', 'Test whether a useful cue survives a delay', 9, { status: 'seed', tags: ['learning', 'memory'], body: 'Fictional candidate idea triggered by asking whether a cue improves immediate performance or changes what people later remember. The distinction may matter even if both produce the same immediate accuracy.', fields: { why: 'Immediate success may not persist once support is removed.', trigger: 'Writing the alternative explanations for the cue pilot.', audience: 'Researchers interested in the boundary between temporary support and durable learning.', advantage: 'Could adapt an existing task after validating the basic measurement.', uncertainty: 'Attrition and baseline forgetting could obscure the contrast.', nextStep: 'Write separate immediate and delayed predictions before building another task.', restart: 'Revisit when the immediate result is interpretable.', learning: 'Learn to design a comparison across time without changing everything else.' } }),
    example('i-transfer', 'idea', 'Try the explanation on a different task format', 11, { status: 'paused', tags: ['generalization', 'design'], body: 'Fictional candidate idea: test a prediction across two formats only after specifying which underlying relation is shared. A second task is not automatically a stronger test.', fields: { why: 'An explanation should say where its prediction travels and where it fails.', trigger: 'Noticing how much the first design depends on a visual display.', audience: 'Researchers developing explanations that make predictions beyond one task.', advantage: 'The task scaffold can be reused, but no special second-task data are available.', uncertainty: 'The tasks may differ in difficulty and strategy demands.', nextStep: 'Map the hypothesized common relation and one deliberately changed feature.', restart: 'Resume when the accounts predict different outcomes in the first task.', learning: 'Practice specifying what remains invariant across tasks.' } }),
    example('r-control', 'paper', 'A caution about interpreting cue effects', 45, { status: 'exploring', learnedOn: day(45), tags: ['reading', 'controls'], body: 'Example reading note for a fictional source, not a real citation. This reading happened earlier; importing it again should not promote it into this month’s learning.', fields: { publishedOn: '1998', question: 'What else changes when a cue is added?', evidence: 'The invented example motivates a matched comparison for salience, timing, and instructions.', uncertainty: 'Matching visual salience does not prove equal attention.', why: 'It changed the immediate goal from demonstrating a difference to finding an interpretable difference.', nextStep: 'Write down which confounds each control does and does not address.' } }),
    example('c-review', 'capability', 'Turn a broad literature question into contrasting predictions', 14, { status: 'exploring', tags: ['theory', 'reading'], body: 'A developing capability in this fictional workspace: reconstruct competing explanations from reading, state their assumptions, and identify observations that would differ.', fields: { evidence: 'The two explanation cards and prediction card are a first attempt, not proof of expertise.', contribution: 'The researcher drafted the account comparison; the peer helped reveal an attention confound.', uncertainty: 'Need more practice recognizing when two verbal accounts imply the same behavior.', learning: 'Write a minimal model for each explanation and test whether their predictions overlap.' } }),
    example('artifact-checks', 'project', 'Completed artifact: an event-logging check', 3, { status: 'completed', tags: ['artifact', 'experiments'], body: 'Fictional completed artifact: a small, inspected log from scripted task actions. It demonstrates that these scripted actions can be recorded after a repair. It supplies no evidence about a participant mechanism.', fields: { why: 'Before interpreting sequences, check that the intended actions can be observed.', evidence: 'Version 0.2 toy check records the expected scripted action order. Cross-device timing and participant behavior were outside scope.', contribution: 'Researcher wrote the check and repaired the missing-event handler; shared scaffold supplied the basic task.', learning: 'Separating successful instrumentation from a valid scientific inference.', uncertainty: 'A logging check cannot show that observed sequences uniquely reveal a strategy.', sourceUrl: '' } }),
    example('ref-identifiability', 'reflection', 'Recording more behavior is not the same as identifying a strategy', 1, { status: 'active', tags: ['research judgment', 'measurement'], body: 'Example reflection: I initially treated a richer log as a solution to the measurement problem. Simulating two accounts reminded me that both can generate the same observed behavior. I now need an informative manipulation as well as a reliable log.', fields: { why: 'The synthetic accounts overlapped even after the logging repair.', evidence: 'The limitation card and completed instrumentation check answer different questions.', nextStep: 'Find a manipulation where the candidate accounts make different predictions.' } }),
    example('o-cue', 'claim', 'Toy observation: both cue variants changed the recorded path', 4, { status: 'exploring', tags: ['pilot', 'observation'], body: 'Invented observation for this example only. In a scripted walkthrough, both the relation cue and the unrelated salient cue changed the action path. This is a description of the toy record, not evidence that a cue improves human learning.', fields: { claimKind: 'observation', claimStatus: 'provisional', sourceRef: 'Fictional pilot walkthrough notes', sourceVersion: 'walkthrough-v0.1', evidence: 'Two scripted paths differ from the no-cue path.', uncertainty: 'No participants, statistical estimate, or mechanism inference is involved.' } }),
    example('exp-recognition', 'claim', 'Candidate explanation: the cue makes shared structure recognizable', 5, { status: 'exploring', tags: ['explanation', 'learning'], body: 'Fictional candidate explanation. It needs a behavioral prediction that differs from general attention; a good-sounding verbal story is not enough.', fields: { claimKind: 'explanation', claimStatus: 'provisional', sourceRef: 'Cue pilot design memo', sourceVersion: 'accounts-v0.2', evidence: 'Motivated by the old problem and the proposed relation cue; no established mechanism is claimed.', uncertainty: 'The current cue could affect both recognition and attention.', nextStep: 'Specify the action sequence predicted when shared structure is visible but the cue is not more salient.' } }),
    example('exp-attention', 'claim', 'Alternative explanation: any noticeable cue changes engagement', 4, { status: 'exploring', tags: ['explanation', 'controls'], body: 'Fictional alternative explanation. General engagement might alter the path without recognition of shared structure. Its own predictions must be explicit enough to test.', fields: { claimKind: 'explanation', claimStatus: 'provisional', sourceRef: 'Fictional peer design critique', sourceVersion: 'critique-v0.1', uncertainty: 'An account that predicts any possible path is not a useful alternative.', nextStep: 'Write the expected path under an equally salient unrelated cue.' } }),
    example('pred-cue', 'claim', 'Proposed test: separate relation information from salience', 2, { status: 'seed', tags: ['prediction', 'design'], body: 'Fictional test proposal: compare information about the reusable relation while keeping cue appearance and timing matched. Decide what each candidate account predicts before examining an outcome.', fields: { claimKind: 'prediction', claimStatus: 'provisional', sourceRef: 'Cue pilot design memo', sourceVersion: 'design-v0.3', evidence: 'Derived from the two candidate explanations, not from an observed effect.', uncertainty: 'The manipulation may still change difficulty. The alternative account is not yet fully specified.', nextStep: 'Simulate the anticipated paths and list which results would challenge each explanation.' } }),
    example('limit-log', 'claim', 'Method limitation: a missing event can resemble a strategy change', 4, { status: 'exploring', tags: ['limitation', 'measurement'], body: 'Fictional instrumentation limitation from the toy walkthrough. One skipped log event changed the apparent sequence. A mechanism claim should wait until this measurement issue is addressed.', fields: { claimKind: 'limitation', claimStatus: 'supported', sourceRef: 'Fictional scripted logging check', sourceVersion: 'logger-v0.1', evidence: 'The scripted action was visible in the walkthrough but absent from the recorded log; the v0.2 artifact repairs this specific case.', uncertainty: 'Fixing this case does not establish that every possible event is recorded correctly.', nextStep: 'Retain the failed case as a regression check and distinguish it from the scientific prediction.' } }),
  ];
  const link = (source, target, relation, reason, status = 'confirmed') => createEdge(source, target, { id: `e-${source}-${target}`, relation, reason, status, createdAt: stamp(3), updatedAt: stamp(3) });
  workspace.edges = [
    link('r-classic', 'p-generalize', 'raises', 'This example note preserves the motivating question beyond any particular method.'),
    link('i-cue', 'p-generalize', 'explores', 'A possible test of whether making shared structure visible changes strategy reuse.'),
    link('i-path', 'p-measure', 'explores', 'Action sequences might distinguish strategies that reach the same result.'),
    link('r-method', 'i-path', 'may unblock', 'A new sequence method could help, if its assumptions fit the task.', 'suggested'),
    link('c-sim', 'i-path', 'could support', 'Simulation can check distinguishability before collecting data.'),
    link('c-task', 'i-cue', 'supports', 'The idea calls for a small task that can be built and inspected.'),
    link('res-template', 'proj-pilot', 'could support', 'The scaffold may shorten implementation once the design is clearer.'),
    link('proj-pilot', 'i-cue', 'tests', 'The pilot turns the idea into a concrete design attempt.'),
    link('proj-pilot', 'c-task', 'could demonstrate', 'A completed, inspected task could become evidence of the capability.'),
    link('ref-question', 'proj-pilot', 'reframes', 'The first milestone is a design critique, not data collection.'),
    link('person-peer', 'c-sim', 'could help develop', 'A focused methods discussion might surface assumptions.', 'suggested'),
    link('p-measure', 'p-generalize', 'complicates', 'An apparent change in reuse may depend on how strategies are measured.'),
    link('r-classic', 'i-cue', 'inspires', 'The old question suggests a specific manipulation to examine.'),
    link('c-sim', 'proj-pilot', 'could strengthen', 'Check the expected pattern under each proposed explanation before building the task.'),
    link('ref-question', 'p-measure', 'returns to', 'Thinking through the pilot raised the question of what the outcome actually measures.'),
    link('person-peer', 'proj-pilot', 'could critique', 'A design walkthrough could surface an overlooked control condition.', 'suggested'),
    link('r-control', 'exp-attention', 'proposes alternative', 'The older reading motivates an attention account; it does not show that this account is true.'),
    link('exp-recognition', 'proj-pilot', 'explains', 'This is one candidate explanation the pilot is intended to examine.'),
    link('exp-attention', 'exp-recognition', 'challenges', 'The cue might alter engagement without revealing shared structure. Both accounts need distinct predictions.'),
    link('o-cue', 'exp-recognition', 'challenges', 'Both toy cue variants changed the path, so the walkthrough does not uniquely favor a relation-specific account.'),
    link('o-cue', 'exp-attention', 'could support', 'The pattern is compatible with general attention, but a scripted walkthrough cannot establish a human mechanism.', 'suggested'),
    link('limit-log', 'o-cue', 'limits', 'A missing event means even the descriptive path comparison needs an instrumentation check.'),
    link('artifact-checks', 'limit-log', 'addresses', 'Version 0.2 repairs the particular missing event; it does not remove every measurement limitation.'),
    link('artifact-checks', 'c-task', 'demonstrates', 'The completed scripted check is evidence of logging implementation and inspection, within its stated limits.'),
    link('pred-cue', 'proj-pilot', 'inspires next test', 'The immediate next step is to specify contrasting predictions and check their observability.'),
    link('pred-cue', 'exp-recognition', 'tests', 'The structure account needs a relation-specific predicted sequence under matched salience.'),
    link('pred-cue', 'exp-attention', 'tests', 'The engagement account needs a concrete alternative predicted sequence.'),
    link('r-method', 'p-measure', 'provides measurement', 'Sequence logging may expose intermediate actions, subject to observability and identification limits.', 'suggested'),
    link('ref-identifiability', 'p-measure', 'changes question', 'The question became: which manipulation separates the strategies, given a reliable log?'),
    link('ref-identifiability', 'proj-pilot', 'inspires next test', 'Move from logging more actions to checking whether candidate accounts predict different actions.'),
    link('c-review', 'pred-cue', 'supports', 'Writing competing predictions is a developing capability that this design exercise can strengthen.'),
    link('i-delay', 'i-cue', 'extends', 'A delayed comparison may distinguish temporary support from a lasting change, after the immediate measurement is understood.'),
    link('i-transfer', 'p-robust', 'explores', 'A second format can probe a theoretically chosen boundary instead of merely adding another dataset.'),
    link('i-transfer', 'proj-pilot', 'depends on', 'Pause this extension until the first task has an interpretable contrast.'),
    link('r-classic', 'r-method', 'may be revisited with', 'Old bottleneck: intermediate choices were hidden. New possibility: record sequences. Still unresolved: whether sequences identify strategies.', 'suggested'),
  ];
  workspace.decisions = [
    { id: 'decision-first-attempt', nodeId: 'proj-pilot', title: 'Try a small design walkthrough', body: 'Example decision: start with a cheap attempt that can reveal ambiguities before committing to data collection.', before: 'A broad study might show whether cues help.', trigger: 'The old problem suggested a specific relation cue and a task scaffold became available.', after: 'First check whether the planned comparison can distinguish the explanations.', action: 'Draw the conditions and record the predicted paths.', outcome: 'proceed', createdAt: stamp(6) },
    { id: 'decision-pilot', nodeId: 'proj-pilot', title: 'Seek contrasting predictions before collecting data', body: 'Example decision: the cue could affect attention as well as recognition; the toy observation cannot settle the mechanism.', before: 'A cue-related path change would favor recognition of shared structure.', trigger: 'The matched cue also changed the toy path, and a critique supplied an attention account.', after: 'The observation is compatible with more than one explanation.', action: 'Specify two contrasting predictions, repair the event log, and inspect synthetic paths.', outcome: 'evidence', createdAt: stamp(2) },
    { id: 'decision-extension', nodeId: 'i-transfer', title: 'Pause the second task until the first contrast is interpretable', body: 'Example decision: pause because a second format would currently multiply the same ambiguity, not because generalization is unimportant.', before: 'A second task would make the project stronger immediately.', trigger: 'The pilot accounts still predict overlapping observations.', after: 'First identify what the explanation predicts should stay the same across tasks.', action: 'Resume when the first task separates the accounts and an invariant relation is specified.', outcome: 'pause', createdAt: stamp(1) },
  ];
  workspace.reviews = [
    { id: 'review-question', nodeId: 'ref-question', period: day(0).slice(0, 7), title: 'An old question, a new method, and a remaining bottleneck', body: 'Fictional monthly review. The sequence method brought an old question back into reach, but it did not settle how a recorded path should be interpreted. Next month I want one design where the accounts make different predictions. The historical reading imported today stays undated; it is not new learning.', createdAt: stamp(2) },
    { id: 'review-identifiability', nodeId: 'ref-identifiability', period: day(0).slice(0, 7), title: 'Separate a completed technical check from a scientific conclusion', body: 'Fictional review. Completing the event-logging check supplies evidence of a bounded implementation skill. It does not demonstrate a mechanism. Keep the completed artifact, the open question, and the provisional explanation as separate linked records.', createdAt: stamp(1) },
  ];
  workspace.focusIds = ['proj-pilot', 'p-measure'];
  workspace.plans = [
    { id: 'plan-predictions', nodeId: 'proj-pilot', week: weekStart(base), action: 'Sketch one comparison that yields different predicted paths under the two accounts.', why: 'This reduces the main uncertainty about whether the pilot would be informative.', outcome: '', done: false, createdAt: stamp(1), updatedAt: stamp(1) },
    { id: 'plan-log', nodeId: 'artifact-checks', week: weekStart(base), action: 'Inspect the scripted log after repairing the missing event.', why: 'An incomplete log could mimic a strategy change.', outcome: 'The specific scripted path is now recorded in order; broader timing validation remains outside this check.', done: true, createdAt: stamp(3), updatedAt: stamp(0) },
    { id: 'plan-prior', nodeId: 'proj-pilot', week: weekStart(new Date(base.getTime() - 7 * 86400000)), action: 'Draw the cue and control conditions for the first walkthrough.', why: 'Make the proposed comparison concrete before coding.', outcome: 'The walkthrough exposed an attention confound and one missing log event.', done: true, createdAt: stamp(9), updatedAt: stamp(7) },
  ];
  return validateWorkspace(workspace);
}
