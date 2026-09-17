import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createEmptyWorkspace, createNode, validateWorkspace } from './model.js';
import { unifiedJournal, journalPage, deskPage, weeklyPage } from './workflow-ui.js';

const timestamp = '2026-09-16T12:00:00.000Z';
function workspace() {
  const value = createEmptyWorkspace();
  value.nodes = [
    createNode('problem', { id: 'focus', title: 'Chosen research question', status: 'exploring', fields: { uncertainty: 'Which account predicts a different result?' } }),
    createNode('project', { id: 'other', title: 'Active but not selected today', status: 'active' }),
  ];
  value.focusIds = ['focus'];
  value.plans = [
    { id: 'current', nodeId: 'focus', week: '2026-09-14', action: 'Current selected simulation', why: 'Compare two predictions', outcome: '', done: false, createdAt: timestamp, updatedAt: timestamp },
    { id: 'done', nodeId: 'focus', week: '2026-09-14', action: 'Completed current check', why: 'Verify the log', outcome: 'Scripted sequence is intact', done: true, createdAt: timestamp, updatedAt: timestamp },
    { id: 'prior', nodeId: 'focus', week: '2026-09-07', action: 'Prior week design walkthrough', why: 'Make assumptions explicit', outcome: '', done: false, createdAt: timestamp, updatedAt: timestamp },
  ];
  return validateWorkspace(value);
}

test('the thinking history contains reflection nodes, reviews, and structured decisions together', () => {
  const data = workspace();
  data.nodes.push(createNode('reflection', { id: 'reflection', title: 'My captured reflection', body: 'A change worth keeping.', eventDate: '2026-09-10', createdAt: timestamp, updatedAt: timestamp }));
  data.reviews.push({ id: 'review', nodeId: 'focus', period: '2026-09', title: 'My monthly review', body: 'An old question is newly approachable.', createdAt: '2026-09-11T12:00:00.000Z' });
  data.decisions.push({ id: 'decision', nodeId: 'focus', title: 'My research decision', body: 'Preserve my reasoning.', before: 'Collect data now', trigger: 'The accounts predict the same outcome', after: 'Need an informative comparison', action: 'Simulate first', outcome: 'evidence', createdAt: '2026-09-12T12:00:00.000Z' });
  const entries = unifiedJournal(data);
  assert.deepEqual(entries.map(entry => entry.entryKind), ['decision', 'review', 'reflection']);
  assert.equal(entries[2].entryDate, '2026-09-10', 'activity date, not import/creation date, orders dated reflection notes');
  const html = journalPage(data, '2026-09');
  for (const title of ['My captured reflection', 'My monthly review', 'My research decision']) assert.ok(html.includes(title));
  assert.ok(html.includes('Need an informative comparison'));
  const notesOnly = journalPage(data, '2026-09', 'reflection');
  assert.ok(notesOnly.includes('My captured reflection'));
  assert.ok(!notesOnly.includes('My monthly review'));
  assert.ok(!notesOnly.includes('My research decision'));
});

test('monthly knowledge choices exclude old imports and undated readings', () => {
  const data = workspace();
  data.nodes.push(
    createNode('paper', { id: 'undated', title: 'Imported old source with unknown reading date', importedAt: timestamp, fields: { publishedOn: '1974' } }),
    createNode('paper', { id: 'past', title: 'Previously read source imported today', learnedOn: '2026-08-30', importedAt: timestamp }),
    createNode('paper', { id: 'learned', title: 'Old source actually read this month', learnedOn: '2026-09-01', fields: { publishedOn: '1974' } }),
  );
  const html = journalPage(data, '2026-09');
  const options = html.match(/<select id="review-knowledge">([\s\S]*?)<\/select>/)[1];
  assert.ok(options.includes('Old source actually read this month'));
  assert.ok(!options.includes('Imported old source with unknown reading date'));
  assert.ok(!options.includes('Previously read source imported today'));
  assert.match(html, /1 dated learning records · 1 have no learning date and are excluded/);
});

test('the desk displays deliberate focus and unfinished steps from only the requested week', () => {
  const html = deskPage(workspace(), '2026-09-14');
  assert.ok(html.includes('Chosen research question'));
  assert.ok(html.includes('Which account predicts a different result?'));
  assert.ok(!html.includes('Active but not selected today'));
  assert.ok(html.includes('Current selected simulation'));
  assert.ok(!html.includes('Completed current check'));
  assert.ok(!html.includes('Prior week design walkthrough'));
});

test('weekly plans retain their completion status and original date without becoming an active-project list', () => {
  const data = workspace();
  const thisWeek = weeklyPage(data, '2026-09-14');
  assert.ok(thisWeek.includes('Current selected simulation'));
  assert.ok(thisWeek.includes('Completed current check'));
  assert.ok(thisWeek.includes('1 of 2 completed'));
  assert.ok(!thisWeek.includes('Prior week design walkthrough'));
  assert.ok(!thisWeek.includes('Active but not selected today'));
  const previous = weeklyPage(data, '2026-09-07');
  assert.ok(previous.includes('Prior week design walkthrough'));
  assert.ok(!previous.includes('Current selected simulation'));
  assert.ok(!previous.includes('Completed current check'));
});

test('rendering personal reasoning escapes markup in titles, actions, and journal content', () => {
  const data = workspace();
  data.nodes[0].title = '<img src=x onerror=alert(1)>';
  data.plans[0].action = '<script>alert(1)</script>';
  data.nodes.push(createNode('reflection', { title: '<b>Private thought</b>', body: '<script>leak()</script>' }));
  const desk = deskPage(data, '2026-09-14');
  assert.ok(!desk.includes('<img src=x'));
  assert.ok(!desk.includes('<script>'));
  assert.ok(desk.includes('&lt;script&gt;'));
  const journal = journalPage(data, '2026-09');
  assert.ok(!journal.includes('<script>leak()'));
  assert.ok(journal.includes('&lt;b&gt;Private thought&lt;/b&gt;'));
});

test('mixed date-only reflections and UTC decisions sort in the same local calendar used for display', () => {
  const workflowURL = new URL('./workflow-ui.js', import.meta.url).href;
  const data = {
    nodes: [{ id: 'dated-reflection', type: 'reflection', eventDate: '2026-09-15', createdAt: '2026-09-16T12:00:00.000Z' }],
    reviews: [],
    decisions: [{ id: 'timestamped-decision', createdAt: '2026-09-15T05:00:00.000Z' }],
  };
  const script = `const { unifiedJournal } = await import(${JSON.stringify(workflowURL)}); process.stdout.write(JSON.stringify(unifiedJournal(${JSON.stringify(data)}).map(entry => entry.id)));`;
  for (const [timezone, expected] of [
    ['America/Los_Angeles', ['dated-reflection', 'timestamped-decision']],
    ['Asia/Tokyo', ['timestamped-decision', 'dated-reflection']],
  ]) {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env: { ...process.env, TZ: timezone } });
    assert.deepEqual(JSON.parse(output), expected, timezone);
  }
});
