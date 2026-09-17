#!/usr/bin/env node
/** Standalone structural check. No files are changed; no research facts are verified. */
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const TYPES = ['problem', 'idea', 'paper', 'capability', 'resource', 'project', 'reflection', 'person', 'claim'];
const STAGES = ['seed', 'exploring', 'active', 'paused', 'completed', 'archived'];
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
function fail(path, message) { throw new Error(`${path}: ${message}`); }
function str(value, path, max = 30000, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(path, `expected ${required ? 'nonempty ' : ''}text, at most ${max} characters`);
}
function obj(value, path, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'expected object');
  if (allowed) for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(path, `unsupported key ${key}`);
}
function arr(value, path, max) {
  if (!Array.isArray(value) || value.length > max) fail(path, `expected list, at most ${max} items`);
  return value;
}
function choice(value, path, values) { if (!values.includes(value)) fail(path, `expected one of ${values.join(', ')}`); }
function iso(value, path) {
  str(value, path, 100, true);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19)) fail(path, 'expected valid UTC ISO timestamp');
}
function day(value, path, required = false) {
  value = value ?? '';
  if (!value && !required) return;
  str(value, path, 10, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(path, 'expected YYYY-MM-DD');
  iso(`${value}T00:00:00.000Z`, path);
}
function id(value, path) { str(value, path, 200, true); }
function ids(items, path) {
  const values = new Set();
  for (const item of items) {
    id(item.id, `${path}.id`);
    if (values.has(item.id)) fail(path, `duplicate ID ${item.id}`);
    values.add(item.id);
  }
  return values;
}
function times(value, path, updated = true) {
  iso(value.createdAt, `${path}.createdAt`);
  if (updated) iso(value.updatedAt, `${path}.updatedAt`);
}
function title(value, path) { str(value, path, 500, true); }

export function validateAtlas(w) {
  obj(w, 'Workspace', ['schemaVersion', 'id', 'name', 'nodes', 'edges', 'decisions', 'reviews', 'focusIds', 'plans', 'createdAt', 'updatedAt']);
  choice(w.schemaVersion, 'Workspace.schemaVersion', [1, 2]);
  id(w.id, 'Workspace.id'); title(w.name, 'Workspace.name'); times(w, 'Workspace');
  const nodes = arr(w.nodes, 'nodes', 5000);
  const nodeIds = ids(nodes, 'nodes');
  nodes.forEach((n, i) => {
    const p = `nodes[${i}]`;
    obj(n, p, ['id', 'type', 'title', 'body', 'status', 'tags', 'fields', 'eventDate', 'learnedOn', 'importedAt', 'createdAt', 'updatedAt']);
    choice(n.type, `${p}.type`, TYPES); title(n.title, `${p}.title`); str(n.body ?? '', `${p}.body`);
    choice(n.status ?? 'seed', `${p}.status`, STAGES);
    arr(n.tags ?? [], `${p}.tags`, 100).forEach((t, j) => str(t, `${p}.tags[${j}]`, 100, true));
    const fields = n.fields ?? {};
    obj(fields, `${p}.fields`);
    if (Object.keys(fields).length > 100) fail(`${p}.fields`, 'too many fields');
    for (const [key, value] of Object.entries(fields)) {
      str(key, `${p}.fields key`, 100, true);
      if (forbidden.has(key)) fail(`${p}.fields`, `forbidden key ${key}`);
      str(value, `${p}.fields.${key}`, /url$/i.test(key) ? 4000 : 30000);
      if (/url$/i.test(key) && value.trim()) {
        let url;
        try { url = new URL(value); } catch { fail(`${p}.fields.${key}`, 'expected absolute HTTP(S) URL'); }
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) fail(`${p}.fields.${key}`, 'expected HTTP(S) URL without credentials');
      }
    }
    if (n.type === 'claim') {
      if (fields.claimKind) choice(fields.claimKind, `${p}.fields.claimKind`, ['observation', 'explanation', 'prediction', 'limitation']);
      if (fields.claimStatus) choice(fields.claimStatus, `${p}.fields.claimStatus`, ['provisional', 'supported', 'challenged']);
    }
    day(n.eventDate, `${p}.eventDate`); day(n.learnedOn, `${p}.learnedOn`);
    if (n.importedAt != null && n.importedAt !== '') iso(n.importedAt, `${p}.importedAt`);
    times(n, p);
  });
  const ref = (value, path, nullable = false) => {
    if (nullable && value == null) return;
    id(value, path);
    if (!nodeIds.has(value)) fail(path, `missing node ${value}; include referenced nodes in this file`);
  };
  const edges = arr(w.edges, 'edges', 15000); ids(edges, 'edges');
  edges.forEach((e, i) => {
    const p = `edges[${i}]`;
    obj(e, p, ['id', 'source', 'target', 'relation', 'reason', 'status', 'createdAt', 'updatedAt']);
    ref(e.source, `${p}.source`); ref(e.target, `${p}.target`);
    if (e.source === e.target) fail(p, 'endpoints must differ');
    str(e.relation, `${p}.relation`, 200, true); str(e.reason ?? '', `${p}.reason`);
    choice(e.status ?? 'confirmed', `${p}.status`, ['confirmed', 'suggested']); times(e, p);
  });
  const decisions = arr(w.decisions ?? [], 'decisions', 10000); ids(decisions, 'decisions');
  decisions.forEach((d, i) => {
    const p = `decisions[${i}]`;
    obj(d, p, ['id', 'nodeId', 'title', 'body', 'before', 'trigger', 'after', 'action', 'outcome', 'createdAt']);
    ref(d.nodeId, `${p}.nodeId`, true); title(d.title, `${p}.title`);
    for (const key of ['body', 'before', 'trigger', 'after', 'action']) str(d[key] ?? '', `${p}.${key}`);
    choice(d.outcome ?? '', `${p}.outcome`, ['', 'proceed', 'evidence', 'pause', 'drop']); times(d, p, false);
  });
  const reviews = arr(w.reviews ?? [], 'reviews', 2000); ids(reviews, 'reviews');
  reviews.forEach((r, i) => {
    const p = `reviews[${i}]`;
    obj(r, p, ['id', 'nodeId', 'period', 'title', 'body', 'createdAt']);
    ref(r.nodeId, `${p}.nodeId`, true); title(r.title, `${p}.title`);
    str(r.period ?? '', `${p}.period`, 100); str(r.body ?? '', `${p}.body`); times(r, p, false);
  });
  const focusIds = arr(w.focusIds ?? [], 'focusIds', 5000);
  if (new Set(focusIds).size !== focusIds.length) fail('focusIds', 'duplicate ID');
  focusIds.forEach((v, i) => ref(v, `focusIds[${i}]`));
  const plans = arr(w.plans ?? [], 'plans', 10000); ids(plans, 'plans');
  plans.forEach((p, i) => {
    const at = `plans[${i}]`;
    obj(p, at, ['id', 'nodeId', 'week', 'action', 'why', 'outcome', 'done', 'createdAt', 'updatedAt']);
    ref(p.nodeId, `${at}.nodeId`); day(p.week, `${at}.week`, true);
    if (new Date(`${p.week}T12:00:00Z`).getUTCDay() !== 1) fail(`${at}.week`, 'must be Monday');
    str(p.action, `${at}.action`, 30000, true); str(p.why ?? '', `${at}.why`); str(p.outcome ?? '', `${at}.outcome`);
    if (typeof p.done !== 'boolean') fail(`${at}.done`, 'expected boolean');
    times(p, at);
  });
  return { nodes: nodes.length, edges: edges.length, decisions: decisions.length, reviews: reviews.length, plans: plans.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.argv[2]) throw new Error('Usage: node scripts/validate.mjs /path/to/research-atlas.json');
    const raw = readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, '');
    if (raw.length > 25000000) throw new Error('File exceeds the 25 MB character limit');
    const counts = validateAtlas(JSON.parse(raw));
    console.log(`Valid Research Atlas structure: ${JSON.stringify(counts)}. Research claims and provenance still require review.`);
  } catch (error) {
    console.error(`Invalid Research Atlas import: ${error.message}`);
    process.exitCode = 1;
  }
}
