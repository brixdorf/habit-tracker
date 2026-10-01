import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, resetData, dateUtils } from './helpers.js';

const { todayIST, currentMonthIST } = dateUtils;

let client;
before(async () => {
  client = await startServer();
  await client.login();
});
after(() => client.close());
beforeEach(resetData);

async function seed() {
  const { body: habit } = await client.post('/api/habits', { name: 'Read', goal: 10 });
  await client.post(`/api/habits/${habit.id}/checks/${todayIST()}/toggle`);
  const { body: note } = await client.post('/api/notes', { month: currentMonthIST(), content: 'hello' });
  await client.patch(`/api/notes/${note.id}/pin`, { pinned: true });
  return { habitId: habit.id, noteId: note.id };
}

async function snapshotState() {
  const month = currentMonthIST();
  return {
    habits: (await client.get(`/api/habits?month=${month}`)).body,
    notes: (await client.get(`/api/notes?month=${month}`)).body,
  };
}

test('export returns a versioned snapshot named with the IST date', async () => {
  await seed();
  const res = await client.get('/api/export');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-disposition'), new RegExp(`habit-tracker-export-${todayIST()}\\.json`));
  assert.equal(res.body.version, 1);
  assert.equal(res.body.habits.length, 1);
  assert.equal(res.body.habitGoals.length, 1);
  assert.equal(res.body.checks.length, 1);
  assert.equal(res.body.notes.length, 1);
});

test('import restores an export exactly, replacing current data', async () => {
  await seed();
  const before = await snapshotState();
  const exported = (await client.get('/api/export')).body;

  resetData();
  await client.post('/api/habits', { name: 'Something else', goal: 3 });
  await client.post('/api/notes', { month: currentMonthIST(), content: 'other' });

  const res = await client.post('/api/import', exported);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(await snapshotState(), before);
});

test('import rejects malformed snapshots without touching existing data', async () => {
  await seed();
  const before = await snapshotState();
  const exported = (await client.get('/api/export')).body;

  let res = await client.post('/api/import', { habits: [] });
  assert.equal(res.status, 400);

  res = await client.post('/api/import', { ...exported, version: 99 });
  assert.equal(res.status, 400);

  // A check pointing at a habit that does not exist must roll the whole import back.
  res = await client.post('/api/import', {
    ...exported,
    checks: [...exported.checks, { id: 999, habit_id: 424242, date: '2026-01-01' }],
  });
  assert.equal(res.status, 400);

  assert.deepEqual(await snapshotState(), before);
});
