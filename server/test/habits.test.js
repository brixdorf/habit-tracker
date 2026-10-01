import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, resetData, db, dateUtils } from './helpers.js';

const { todayIST, currentMonthIST, addMonths, daysInMonth } = dateUtils;

let client;
before(async () => {
  client = await startServer();
  await client.login();
});
after(() => client.close());
beforeEach(resetData);

const thisMonth = () => currentMonthIST();

async function createHabit(name, goal = 20) {
  const res = await client.post('/api/habits', { name, goal });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.id;
}

async function habitsFor(month) {
  const res = await client.get(`/api/habits?month=${month}`);
  assert.equal(res.status, 200);
  return res.body;
}

async function habitFor(month, id) {
  return (await habitsFor(month)).find((h) => h.id === id);
}

// Inserts a habit created on an earlier date, the way it would exist after months of use.
function insertOldHabit(name, createdDate, goal, position) {
  const info = db
    .prepare(
      'INSERT INTO habits (name, color, position, created_date, archived_date, created_at) VALUES (?, ?, ?, ?, NULL, ?)'
    )
    .run(name, 'hsl(0, 42%, 48%)', position, createdDate, Date.now());
  db.prepare('INSERT INTO habit_goals (habit_id, month, goal) VALUES (?, ?, ?)').run(
    info.lastInsertRowid,
    createdDate.slice(0, 7),
    goal
  );
  return Number(info.lastInsertRowid);
}

test('month query param is required and validated', async () => {
  assert.equal((await client.get('/api/habits')).status, 400);
  assert.equal((await client.get('/api/habits?month=2026-1')).status, 400);
});

test('creating a habit adds it to the current month with its goal', async () => {
  const id = await createHabit('  Read  ', 12);
  const habit = await habitFor(thisMonth(), id);
  assert.equal(habit.name, 'Read');
  assert.equal(habit.goal, 12);
  assert.equal(habit.storedGoal, 12);
  assert.equal(habit.achieved, 0);
  assert.deepEqual(habit.checkedDates, []);
  assert.equal(habit.createdDate, todayIST());
  assert.equal(habit.archivedDate, null);
  assert.match(habit.color, /^hsl\(/);
});

test('creating a habit validates name and goal', async () => {
  assert.equal((await client.post('/api/habits', { name: '  ', goal: 5 })).status, 400);
  assert.equal((await client.post('/api/habits', { name: 'x', goal: 0 })).status, 400);
  assert.equal((await client.post('/api/habits', { name: 'x', goal: 2.5 })).status, 400);
  assert.equal((await client.post('/api/habits', { name: 'x' })).status, 400);
});

test('new habits get colors distinct from every existing habit, even after deletions', async () => {
  const a = await createHabit('A');
  const b = await createHabit('B');
  const c = await createHabit('C');
  assert.equal((await client.delete(`/api/habits/${b}`)).status, 200);
  const d = await createHabit('D');

  const colors = Object.fromEntries((await habitsFor(thisMonth())).map((h) => [h.id, h.color]));
  assert.notEqual(colors[d], colors[a]);
  assert.notEqual(colors[d], colors[c]);
});

test('toggling a day checks and unchecks it and updates the achieved count', async () => {
  const id = await createHabit('Run');
  const today = todayIST();

  let res = await client.post(`/api/habits/${id}/checks/${today}/toggle`);
  assert.deepEqual(res.body, { checked: true });
  let habit = await habitFor(thisMonth(), id);
  assert.deepEqual(habit.checkedDates, [today]);
  assert.equal(habit.achieved, 1);

  res = await client.post(`/api/habits/${id}/checks/${today}/toggle`);
  assert.deepEqual(res.body, { checked: false });
  habit = await habitFor(thisMonth(), id);
  assert.equal(habit.achieved, 0);
});

test('toggling rejects malformed and impossible dates', async () => {
  const id = await createHabit('Run');
  const [year] = thisMonth().split('-');
  assert.equal((await client.post(`/api/habits/${id}/checks/2026-1-1/toggle`)).status, 400);
  assert.equal((await client.post(`/api/habits/${id}/checks/${year}-02-30/toggle`)).status, 400);
  assert.equal((await client.post(`/api/habits/${id}/checks/${year}-13-01/toggle`)).status, 400);
  assert.equal((await client.post(`/api/habits/999999/checks/${todayIST()}/toggle`)).status, 404);
});

test('a habit does not appear or accept checks before its creation month', async () => {
  const id = await createHabit('Stretch');
  const lastMonth = addMonths(thisMonth(), -1);
  assert.equal(await habitFor(lastMonth, id), undefined);
  const res = await client.post(`/api/habits/${id}/checks/${lastMonth}-05/toggle`);
  assert.equal(res.status, 403);
});

test('archiving keeps history, prorates the goal for the archive month, and hides later months', async () => {
  const id = await createHabit('Meditate', 20);
  const today = todayIST();
  await client.post(`/api/habits/${id}/checks/${today}/toggle`);

  assert.equal((await client.post(`/api/habits/${id}/archive`)).status, 200);
  assert.equal((await client.post(`/api/habits/${id}/archive`)).status, 400);

  const month = thisMonth();
  const habit = await habitFor(month, id);
  const day = Number(today.slice(8, 10));
  assert.equal(habit.archivedDate, today);
  assert.equal(habit.cutoffDate, today);
  assert.equal(habit.storedGoal, 20);
  assert.equal(habit.goal, Math.round((20 * day) / daysInMonth(month)));
  assert.deepEqual(habit.checkedDates, [today]);

  assert.equal(await habitFor(addMonths(month, 1), id), undefined);

  const afterCutoff =
    day < daysInMonth(month) ? `${month}-${String(day + 1).padStart(2, '0')}` : `${addMonths(month, 1)}-01`;
  assert.equal((await client.post(`/api/habits/${id}/checks/${afterCutoff}/toggle`)).status, 403);
  // Days up to and including the archive day stay editable.
  assert.equal((await client.post(`/api/habits/${id}/checks/${today}/toggle`)).status, 200);
});

test('goals carry forward into later months until changed', async () => {
  const id = await createHabit('Write', 20);
  const month = thisMonth();
  const next = addMonths(month, 1);

  assert.equal((await habitFor(next, id)).goal, 20);

  // Changing this month's goal after merely looking at next month must still carry forward.
  assert.equal((await client.patch(`/api/habits/${id}`, { goal: 15, month })).status, 200);
  assert.equal((await habitFor(month, id)).goal, 15);
  assert.equal((await habitFor(next, id)).goal, 15);

  // A goal set for a specific month only affects that month onward.
  assert.equal((await client.patch(`/api/habits/${id}`, { goal: 10, month: next })).status, 200);
  assert.equal((await habitFor(next, id)).goal, 10);
  assert.equal((await habitFor(month, id)).goal, 15);
});

test('changing an old month goal does not rewrite goals already in effect for viewed later months', async () => {
  const twoAgo = addMonths(thisMonth(), -2);
  const lastMonth = addMonths(thisMonth(), -1);
  const id = insertOldHabit('Old', `${twoAgo}-03`, 20, 1);

  assert.equal((await habitFor(lastMonth, id)).goal, 20);
  await client.patch(`/api/habits/${id}`, { goal: 5, month: twoAgo });
  assert.equal((await habitFor(twoAgo, id)).goal, 5);
  assert.equal((await habitFor(lastMonth, id)).goal, 20);
});

test('editing a habit validates everything before changing anything', async () => {
  const id = await createHabit('Walk', 8);
  const month = thisMonth();

  let res = await client.patch(`/api/habits/${id}`, { name: 'Renamed', goal: -1, month });
  assert.equal(res.status, 400);
  assert.equal((await habitFor(month, id)).name, 'Walk');

  res = await client.patch(`/api/habits/${id}`, { goal: 5, month: 'garbage' });
  assert.equal(res.status, 400);

  res = await client.patch(`/api/habits/${id}`, { name: '   ' });
  assert.equal(res.status, 400);

  res = await client.patch(`/api/habits/${id}`, { name: ' Long walk ', goal: 9, month });
  assert.equal(res.status, 200);
  const habit = await habitFor(month, id);
  assert.equal(habit.name, 'Long walk');
  assert.equal(habit.goal, 9);

  assert.equal((await client.patch('/api/habits/999999', { name: 'x' })).status, 404);
});

test('deleting a habit removes it and all its data', async () => {
  const id = await createHabit('Temp');
  await client.post(`/api/habits/${id}/checks/${todayIST()}/toggle`);
  assert.equal((await client.delete(`/api/habits/${id}`)).status, 200);
  assert.equal(await habitFor(thisMonth(), id), undefined);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM checks WHERE habit_id = ?').get(id).n, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM habit_goals WHERE habit_id = ?').get(id).n, 0);
  assert.equal((await client.delete(`/api/habits/${id}`)).status, 404);
});

test('reordering active habits changes the grid order', async () => {
  const a = await createHabit('A');
  const b = await createHabit('B');
  const c = await createHabit('C');

  const res = await client.patch('/api/habits/reorder/all', { orderedIds: [c, a, b] });
  assert.equal(res.status, 200);
  assert.deepEqual((await habitsFor(thisMonth())).map((h) => h.id), [c, a, b]);
});

test('reordering rejects invalid id lists', async () => {
  const a = await createHabit('A');
  const b = await createHabit('B');
  const archived = await createHabit('Archived');
  await client.post(`/api/habits/${archived}/archive`);

  const bad = [[a, a], [a, b, 999999], [a, b, archived], 'nope', [a, 'b']];
  for (const orderedIds of bad) {
    const res = await client.patch('/api/habits/reorder/all', { orderedIds });
    assert.equal(res.status, 400, JSON.stringify(orderedIds));
  }
  assert.deepEqual((await habitsFor(thisMonth())).map((h) => h.id).slice(0, 2), [a, b]);
});

test('reordering works while viewing a past month that does not show newer habits', async () => {
  const twoAgo = addMonths(thisMonth(), -2);
  const lastMonth = addMonths(thisMonth(), -1);
  const old1 = insertOldHabit('Old 1', `${twoAgo}-01`, 10, 1);
  const old2 = insertOldHabit('Old 2', `${twoAgo}-02`, 10, 2);
  const fresh = await createHabit('Fresh');

  // The past month only shows (and so can only send) the habits that existed back then.
  assert.deepEqual((await habitsFor(lastMonth)).map((h) => h.id), [old1, old2]);
  const res = await client.patch('/api/habits/reorder/all', { orderedIds: [old2, old1] });
  assert.equal(res.status, 200);

  assert.deepEqual((await habitsFor(lastMonth)).map((h) => h.id), [old2, old1]);
  assert.deepEqual((await habitsFor(thisMonth())).map((h) => h.id), [old2, old1, fresh]);
});

test('reordering leaves archived habits where they were', async () => {
  const a = await createHabit('A');
  const archived = await createHabit('Archived');
  const b = await createHabit('B');
  await client.post(`/api/habits/${archived}/archive`);

  // The grid sends only the active habits it shows; the archived row keeps its slot.
  const res = await client.patch('/api/habits/reorder/all', { orderedIds: [b, a] });
  assert.equal(res.status, 200);
  assert.deepEqual((await habitsFor(thisMonth())).map((h) => h.id), [b, archived, a]);
});
