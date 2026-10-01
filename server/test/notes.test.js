import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, resetData } from './helpers.js';

let client;
before(async () => {
  client = await startServer();
  await client.login();
});
after(() => client.close());
beforeEach(resetData);

const MONTH = '2026-03';

async function createNote(content, month = MONTH) {
  const res = await client.post('/api/notes', { month, content });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.id;
}

async function notesFor(month = MONTH) {
  const res = await client.get(`/api/notes?month=${month}`);
  assert.equal(res.status, 200);
  return res.body;
}

test('notes are scoped to their month and newest appear first', async () => {
  const first = await createNote('  first  ');
  const second = await createNote('second');
  await createNote('other month', '2026-04');

  const notes = await notesFor();
  assert.deepEqual(notes.map((n) => n.id), [second, first]);
  assert.equal(notes[1].content, 'first');
  assert.equal(notes[1].pinned, false);
  assert.equal((await notesFor('2026-04')).length, 1);
});

test('creating a note validates month and content', async () => {
  assert.equal((await client.post('/api/notes', { month: MONTH, content: '   ' })).status, 400);
  assert.equal((await client.post('/api/notes', { month: '2026-3', content: 'x' })).status, 400);
  assert.equal((await client.get('/api/notes')).status, 400);
});

test('pinning moves a note into the pinned group above unpinned notes', async () => {
  const a = await createNote('a');
  const b = await createNote('b');
  const c = await createNote('c');

  assert.equal((await client.patch(`/api/notes/${a}/pin`, { pinned: true })).status, 200);
  let notes = await notesFor();
  assert.deepEqual(notes.map((n) => [n.id, n.pinned]), [[a, true], [c, false], [b, false]]);

  await client.patch(`/api/notes/${b}/pin`, { pinned: true });
  notes = await notesFor();
  assert.deepEqual(notes.map((n) => n.id), [b, a, c]);

  await client.patch(`/api/notes/${b}/pin`, { pinned: false });
  notes = await notesFor();
  assert.deepEqual(notes.map((n) => [n.id, n.pinned]), [[a, true], [b, false], [c, false]]);

  assert.equal((await client.patch(`/api/notes/${a}/pin`, { pinned: 'yes' })).status, 400);
});

test('reordering a group sets its manual order', async () => {
  const a = await createNote('a');
  const b = await createNote('b');
  const c = await createNote('c');

  const res = await client.patch('/api/notes/reorder/group', { month: MONTH, pinned: false, orderedIds: [a, c, b] });
  assert.equal(res.status, 200);
  assert.deepEqual((await notesFor()).map((n) => n.id), [a, c, b]);

  for (const orderedIds of [[a, a, b], [a, b], [a, b, c, 999999]]) {
    const bad = await client.patch('/api/notes/reorder/group', { month: MONTH, pinned: false, orderedIds });
    assert.equal(bad.status, 400, JSON.stringify(orderedIds));
  }
});

test('editing and deleting notes', async () => {
  const id = await createNote('draft');
  assert.equal((await client.patch(`/api/notes/${id}`, { content: ' final ' })).status, 200);
  assert.equal((await notesFor())[0].content, 'final');
  assert.equal((await client.patch(`/api/notes/${id}`, { content: '' })).status, 400);

  assert.equal((await client.delete(`/api/notes/${id}`)).status, 200);
  assert.deepEqual(await notesFor(), []);
  assert.equal((await client.delete(`/api/notes/${id}`)).status, 404);
  assert.equal((await client.patch(`/api/notes/${id}`, { content: 'x' })).status, 404);
});
