import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyWorkspace, createNode, createEdge, validateWorkspace, previewMerge, applyMerge } from './model.js';

const timestamp = '2026-08-01T12:00:00.000Z';
function branch() {
  const workspace = createEmptyWorkspace('My existing research');
  workspace.nodes = [
    createNode('project', { id: 'project', title: 'An ongoing attempt', body: 'Original interpretation', createdAt: timestamp, updatedAt: timestamp }),
    createNode('problem', { id: 'question', title: 'What would distinguish the accounts?', createdAt: timestamp, updatedAt: timestamp }),
  ];
  workspace.edges = [createEdge('project', 'question', { id: 'edge', relation: 'tests', reason: 'The original comparison', createdAt: timestamp, updatedAt: timestamp })];
  workspace.decisions = [{ id: 'decision', nodeId: 'project', title: 'Compare predictions first', body: 'Original reason', before: '', trigger: '', after: '', action: '', outcome: 'evidence', createdAt: timestamp }];
  workspace.reviews = [{ id: 'review', nodeId: 'project', period: '2026-08', title: 'A monthly reflection', body: 'Original understanding', createdAt: timestamp }];
  workspace.plans = [{ id: 'plan', nodeId: 'project', week: '2026-09-14', action: 'Run a small simulation', why: 'Check distinguishability', outcome: '', done: false, createdAt: timestamp, updatedAt: timestamp }];
  workspace.focusIds = ['project'];
  return validateWorkspace(workspace);
}

test('preview is read-only and stable-id reimport is idempotent despite ingestion timestamps', () => {
  const current = branch();
  const incoming = structuredClone(current);
  incoming.nodes[0].updatedAt = '2026-09-16T12:00:00.000Z';
  incoming.nodes[0].importedAt = '2026-09-16T12:00:00.000Z';
  incoming.nodes[0].createdAt = '2026-09-16T12:00:00.000Z';
  const before = JSON.stringify(current);
  const incomingBefore = JSON.stringify(incoming);
  const preview = previewMerge(current, incoming);
  assert.deepEqual(preview.additions, { nodes: 0, edges: 0, decisions: 0, reviews: 0, plans: 0 });
  assert.deepEqual(preview.unchanged, { nodes: 2, edges: 1, decisions: 1, reviews: 1, plans: 1 });
  assert.deepEqual(preview.conflicts, []);
  const merged = applyMerge(current, incoming);
  assert.deepEqual(merged.nodes, current.nodes);
  assert.equal(merged.nodes[0].createdAt, timestamp);
  assert.equal(JSON.stringify(current), before);
  assert.equal(JSON.stringify(incoming), incomingBefore);
});

test('append imports preserve workspace identity, historical dates, and every collection', () => {
  const current = branch();
  const incoming = createEmptyWorkspace('Another workspace name');
  incoming.nodes = [createNode('paper', { id: 'historical', title: 'Historical reading', learnedOn: '2025-04-03', eventDate: '', createdAt: timestamp, updatedAt: timestamp, fields: { publishedOn: '1974' } })];
  incoming.focusIds = ['historical'];
  const merged = applyMerge(current, incoming);
  assert.equal(merged.id, current.id);
  assert.equal(merged.name, current.name);
  assert.equal(merged.createdAt, current.createdAt);
  assert.equal(merged.nodes.length, 3);
  const added = merged.nodes.find(node => node.id === 'historical');
  assert.equal(added.learnedOn, '2025-04-03');
  assert.equal(added.eventDate, '');
  assert.equal(added.createdAt, timestamp);
  assert.ok(added.importedAt);
  assert.deepEqual(merged.focusIds, ['project', 'historical']);
  assert.equal(applyMerge(merged, incoming).nodes.length, 3);
  assert.deepEqual(merged.decisions, current.decisions);
});

test('substantive same-id differences require an explicit conflict choice', () => {
  const current = branch();
  const incoming = branch();
  incoming.nodes[0].body = 'A revised interpretation';
  incoming.nodes[0].learnedOn = '2026-09-01';
  const preview = previewMerge(current, incoming);
  assert.equal(preview.conflicts.length, 1);
  assert.equal(preview.conflicts[0].key, 'nodes:project');
  assert.deepEqual(preview.conflicts[0].changedFields, ['body', 'learnedOn']);
  assert.throws(() => applyMerge(current, incoming), /resolve conflict/);
  assert.throws(() => applyMerge(current, incoming, { 'nodes:project': 'overwrite' }), /must be one of/);
  assert.equal(applyMerge(current, incoming, { 'nodes:project': 'keep' }).nodes[0].body, 'Original interpretation');
  incoming.nodes[0].createdAt = '2026-09-16T12:00:00.000Z';
  const result = applyMerge(current, incoming, { 'nodes:project': 'incoming' });
  assert.equal(result.nodes[0].body, 'A revised interpretation');
  assert.equal(result.nodes[0].createdAt, timestamp);
  assert.ok(result.nodes[0].importedAt);
});

test('keep both forks all incoming references and preserves existing history', () => {
  const current = branch();
  const incoming = branch();
  incoming.nodes[0].body = 'Competing interpretation';
  const merged = applyMerge(current, incoming, { 'nodes:project': 'both' });
  const fork = merged.nodes.find(node => node.body === 'Competing interpretation');
  assert.notEqual(fork.id, 'project');
  assert.equal(merged.nodes.find(node => node.id === 'project').body, 'Original interpretation');
  for (const collection of ['edges', 'decisions', 'reviews', 'plans']) {
    assert.equal(merged[collection].length, 2, collection);
    const old = merged[collection].find(entry => entry.id === current[collection][0].id);
    const added = merged[collection].find(entry => entry.id !== old.id);
    assert.equal(collection === 'edges' ? old.source : old.nodeId, 'project');
    assert.equal(collection === 'edges' ? added.source : added.nodeId, fork.id);
  }
  assert.deepEqual(merged.focusIds, ['project', fork.id]);
  assert.deepEqual(validateWorkspace(merged), merged);
  const again = applyMerge(merged, incoming, { 'nodes:project': 'both' });
  for (const collection of ['nodes', 'edges', 'decisions', 'reviews', 'plans']) assert.equal(again[collection].length, merged[collection].length, collection);
});

test('explicit keep of an edge or history record is respected even when its node is forked', () => {
  const current = branch();
  const incoming = branch();
  incoming.nodes[0].body = 'Competing interpretation';
  incoming.edges[0].reason = 'An incoming argument';
  incoming.decisions[0].body = 'An incoming decision';
  const merged = applyMerge(current, incoming, { 'nodes:project': 'both', 'edges:edge': 'keep', 'decisions:decision': 'both' });
  assert.equal(merged.edges.length, 1);
  assert.equal(merged.edges[0].reason, 'The original comparison');
  const fork = merged.nodes.find(node => node.body === 'Competing interpretation');
  assert.equal(merged.decisions.find(entry => entry.body === 'An incoming decision').nodeId, fork.id);
  assert.equal(merged.decisions.find(entry => entry.id === 'decision').nodeId, 'project');
});

test('same-title different-id records warn without silently merging', () => {
  const current = branch();
  const incoming = createEmptyWorkspace();
  incoming.nodes = [createNode('problem', { id: 'another-question', title: 'What would distinguish the accounts?' })];
  const preview = previewMerge(current, incoming);
  assert.equal(preview.possibleDuplicates.length, 1);
  assert.deepEqual(preview.possibleDuplicates[0], { existingId: 'question', incomingId: 'another-question', title: 'What would distinguish the accounts?' });
  assert.equal(preview.conflicts.length, 0);
  assert.equal(applyMerge(current, incoming).nodes.length, 3);
});

test('invalid imports fail before a result is created and never mutate valid content', () => {
  const current = branch();
  const incoming = branch();
  const before = JSON.stringify(current);
  incoming.reviews[0].nodeId = 'missing';
  assert.throws(() => previewMerge(current, incoming), /missing node/);
  assert.throws(() => applyMerge(current, incoming), /missing node/);
  assert.equal(JSON.stringify(current), before);
});

test('each non-node collection supports explicit incoming or both conflict choices', () => {
  for (const collection of ['edges', 'decisions', 'reviews', 'plans']) {
    const current = branch();
    const incoming = branch();
    const field = collection === 'edges' ? 'reason' : collection === 'plans' ? 'why' : 'body';
    incoming[collection][0][field] = 'New incoming reasoning';
    const key = `${collection}:${incoming[collection][0].id}`;
    const replace = applyMerge(current, incoming, { [key]: 'incoming' });
    assert.equal(replace[collection].length, 1);
    assert.equal(replace[collection][0][field], 'New incoming reasoning');
    const both = applyMerge(current, incoming, { [key]: 'both' });
    assert.equal(both[collection].length, 2);
    assert.equal(both[collection][0][field], current[collection][0][field]);
    assert.equal(both[collection][1][field], 'New incoming reasoning');
    assert.equal(applyMerge(both, incoming, { [key]: 'both' })[collection].length, 2);
  }
});
