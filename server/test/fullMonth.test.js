import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, resetData, db, dateUtils } from './helpers.js';

const { todayIST, currentMonthIST, addMonths, daysInMonth, monthToDates } = dateUtils;

let client;
before(async () => {
  client = await startServer();
  await client.login();
});
after(() => client.close());
beforeEach(resetData);

const thisMonth = () => currentMonthIST();
const lastMonth = () => addMonths(thisMonth(), -1);
const twoAgo = () => addMonths(thisMonth(), -2);
const day = (month, n) => `${month}-${String(n).padStart(2, '0')}`;

// Inserts a habit that has existed since an earlier date, as months of real use would leave it.
function insertHabit({ created, archived = null, goal = 20 }) {
  const info = db
    .prepare(
      'INSERT INTO habits (name, color, position, created_date, archived_date, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run('Daily', 'hsl(0, 42%, 48%)', 1, created, archived, Date.now());
  db.prepare('INSERT INTO habit_goals (habit_id, month, goal) VALUES (?, ?, ?)').run(
    info.lastInsertRowid,
    created.slice(0, 7),
    goal
  );
  return Number(info.lastInsertRowid);
}

async function habitFor(month, id) {
  const res = await client.get(`/api/habits?month=${month}`);
  assert.equal(res.status, 200);
  return res.body.find((h) => h.id === id);
}

async function setFullMonth(id, month, fullMonth) {
  const res = await client.patch(`/api/habits/${id}`, { fullMonth, month });
  assert.equal(res.status, 200, JSON.stringify(res.body));
}

async function check(id, date) {
  const res = await client.post(`/api/habits/${id}/checks/${date}/toggle`);
  assert.equal(res.status, 200, `${date}: ${JSON.stringify(res.body)}`);
}

test('habits are not Full Month unless turned on', async () => {
  const { body } = await client.post('/api/habits', { name: 'Read', goal: 10 });
  const habit = await habitFor(thisMonth(), body.id);
  assert.equal(habit.fullMonth, false);
  assert.equal(habit.startDate, null);
  assert.equal(habit.goal, 10);
});

test('a habit can be created as Full Month without a numeric goal', async () => {
  const res = await client.post('/api/habits', { name: 'Meditate', fullMonth: true });
  assert.equal(res.status, 201, JSON.stringify(res.body));

  const month = thisMonth();
  const today = todayIST();
  const habit = await habitFor(month, res.body.id);
  assert.equal(habit.fullMonth, true);
  // Created today, so the month's requirement runs from today to the last day.
  assert.equal(habit.startDate, today);
  assert.equal(habit.goal, daysInMonth(month) - Number(today.slice(8, 10)) + 1);
  assert.equal(habit.storedGoal, daysInMonth(month));
  assert.equal(habit.achieved, 0);
});

test('creating validates the Full Month flag and still needs a goal without it', async () => {
  assert.equal((await client.post('/api/habits', { name: 'x', fullMonth: 'yes', goal: 5 })).status, 400);
  assert.equal((await client.post('/api/habits', { name: 'x', fullMonth: false })).status, 400);
  assert.equal((await client.post('/api/habits', { name: 'x', fullMonth: true, goal: 0 })).status, 400);
});

test('a Full Month is achieved only when every single day is done', async () => {
  const id = insertHabit({ created: day(twoAgo(), 1) });
  const month = lastMonth();
  await setFullMonth(id, month, true);

  const dates = monthToDates(month);
  let habit = await habitFor(month, id);
  assert.equal(habit.fullMonth, true);
  assert.equal(habit.startDate, null);
  assert.equal(habit.goal, dates.length);

  for (const date of dates.slice(0, -1)) await check(id, date);
  habit = await habitFor(month, id);
  assert.equal(habit.achieved, dates.length - 1);
  assert.ok(habit.achieved < habit.goal, 'missing one day must not count as achieved');

  await check(id, dates.at(-1));
  habit = await habitFor(month, id);
  assert.equal(habit.achieved, habit.goal);
});

test('created mid-month: only days from creation count, and earlier days are locked', async () => {
  const month = lastMonth();
  const total = daysInMonth(month);
  const id = insertHabit({ created: day(month, 10) });
  // Normal habits may backfill their whole creation month.
  await check(id, day(month, 5));

  await setFullMonth(id, month, true);
  let habit = await habitFor(month, id);
  assert.equal(habit.startDate, day(month, 10));
  assert.equal(habit.goal, total - 9);
  assert.equal(habit.achieved, 0, 'days before creation do not count');
  assert.ok(habit.checkedDates.includes(day(month, 5)), 'existing history is kept');

  assert.equal((await client.post(`/api/habits/${id}/checks/${day(month, 5)}/toggle`)).status, 403);
  assert.equal((await client.post(`/api/habits/${id}/checks/${day(month, 9)}/toggle`)).status, 403);

  for (let d = 10; d <= total; d++) await check(id, day(month, d));
  habit = await habitFor(month, id);
  assert.equal(habit.achieved, habit.goal);

  // Turning it off brings back the numeric goal and the normal counting.
  await setFullMonth(id, month, false);
  habit = await habitFor(month, id);
  assert.equal(habit.fullMonth, false);
  assert.equal(habit.startDate, null);
  assert.equal(habit.goal, 20);
  assert.equal(habit.achieved, total - 9 + 1);
});

test('archived mid-month: every day up to and including the archive day is required', async () => {
  const month = lastMonth();
  const id = insertHabit({ created: day(twoAgo(), 1), archived: day(month, 20) });
  // Turned on in an earlier month, so it carries into the archive month.
  await setFullMonth(id, twoAgo(), true);

  let habit = await habitFor(month, id);
  assert.equal(habit.fullMonth, true);
  assert.equal(habit.cutoffDate, day(month, 20));
  assert.equal(habit.goal, 20);

  for (let d = 1; d <= 20; d++) await check(id, day(month, d));
  habit = await habitFor(month, id);
  assert.equal(habit.achieved, 20);
  assert.equal(habit.achieved, habit.goal);
});

test('created and archived in the same month: the days in between are required', async () => {
  const month = lastMonth();
  const id = insertHabit({ created: day(month, 10), archived: day(month, 20) });
  await setFullMonth(id, month, true);
  const habit = await habitFor(month, id);
  assert.equal(habit.goal, 11);
});

test('turning it on applies to the viewed month and later ones, not earlier months', async () => {
  const id = insertHabit({ created: day(twoAgo(), 1) });
  const next = addMonths(thisMonth(), 1);
  await habitFor(twoAgo(), id);

  await setFullMonth(id, lastMonth(), true);
  assert.equal((await habitFor(twoAgo(), id)).fullMonth, false);
  assert.equal((await habitFor(twoAgo(), id)).goal, 20);
  assert.equal((await habitFor(lastMonth(), id)).fullMonth, true);
  assert.equal((await habitFor(thisMonth(), id)).fullMonth, true);
  const nextHabit = await habitFor(next, id);
  assert.equal(nextHabit.fullMonth, true);
  assert.equal(nextHabit.goal, daysInMonth(next));

  await setFullMonth(id, thisMonth(), false);
  assert.equal((await habitFor(thisMonth(), id)).fullMonth, false);
  assert.equal((await habitFor(next, id)).fullMonth, false);
  assert.equal((await habitFor(lastMonth(), id)).fullMonth, true);
});

test('the numeric goal can still be edited and is used again when Full Month is off', async () => {
  const id = insertHabit({ created: day(twoAgo(), 1) });
  const month = lastMonth();
  await setFullMonth(id, month, true);

  const res = await client.patch(`/api/habits/${id}`, { goal: 12, month });
  assert.equal(res.status, 200);
  let habit = await habitFor(month, id);
  assert.equal(habit.storedGoal, 12);
  assert.equal(habit.goal, daysInMonth(month));

  await setFullMonth(id, month, false);
  habit = await habitFor(month, id);
  assert.equal(habit.goal, 12);
});

test('editing validates the Full Month flag and needs a month', async () => {
  const id = insertHabit({ created: day(twoAgo(), 1) });
  let res = await client.patch(`/api/habits/${id}`, { fullMonth: 'yes', month: lastMonth() });
  assert.equal(res.status, 400);
  res = await client.patch(`/api/habits/${id}`, { fullMonth: true });
  assert.equal(res.status, 400);
  assert.equal((await habitFor(lastMonth(), id)).fullMonth, false);
});

test('export and import keep the Full Month setting', async () => {
  const id = insertHabit({ created: day(twoAgo(), 1) });
  await setFullMonth(id, lastMonth(), true);
  await habitFor(thisMonth(), id);

  const exported = (await client.get('/api/export')).body;
  const goalRows = exported.habitGoals.filter((g) => g.habit_id === id);
  assert.deepEqual(
    goalRows.map((g) => [g.month, g.full_month]).sort(),
    [[twoAgo(), 0], [lastMonth(), 1], [thisMonth(), 1]].sort()
  );

  resetData();
  const res = await client.post('/api/import', exported);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal((await habitFor(twoAgo(), id)).fullMonth, false);
  assert.equal((await habitFor(lastMonth(), id)).fullMonth, true);
  assert.equal((await habitFor(thisMonth(), id)).fullMonth, true);
});

test('backups made before Full Month existed still import, with it turned off', async () => {
  const id = insertHabit({ created: day(lastMonth(), 1) });
  const exported = (await client.get('/api/export')).body;
  for (const goal of exported.habitGoals) delete goal.full_month;

  resetData();
  const res = await client.post('/api/import', exported);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const habit = await habitFor(lastMonth(), id);
  assert.equal(habit.fullMonth, false);
  assert.equal(habit.goal, 20);
});
