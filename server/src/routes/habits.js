import { Router } from 'express';
import { db } from '../db.js';
import { todayIST, currentMonthIST, daysInMonth, isValidMonth, isValidDate } from '../dateUtils.js';
import { colorForIndex } from '../services/color.js';
import { getHabitsForMonth, setTargetForMonth, selectHabitById, isDateEditable } from '../services/habits.js';

export const habitsRouter = Router();

// AUTOINCREMENT ids are never reused, so the sequence counts every habit ever created.
// Counting current rows instead would hand out a live habit's color again after a deletion.
const habitSequence = db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'habits'");
const maxPosition = db.prepare('SELECT MAX(position) AS maxPos FROM habits');
const insertHabit = db.prepare(`
  INSERT INTO habits (name, color, position, created_date, archived_date, created_at)
  VALUES (?, ?, ?, ?, NULL, ?)
`);
const insertGoal = db.prepare(
  'INSERT INTO habit_goals (habit_id, month, goal, full_month) VALUES (?, ?, ?, ?)'
);
const updateHabitName = db.prepare('UPDATE habits SET name = ? WHERE id = ?');
const archiveHabit = db.prepare('UPDATE habits SET archived_date = ? WHERE id = ?');
const deleteHabit = db.prepare('DELETE FROM habits WHERE id = ?');
const selectAllHabitsOrdered = db.prepare(
  'SELECT id, archived_date FROM habits ORDER BY position ASC, id ASC'
);
const updatePosition = db.prepare('UPDATE habits SET position = ? WHERE id = ?');

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isPositiveInt(v) {
  return Number.isInteger(v) && v > 0;
}

habitsRouter.get('/', (req, res) => {
  const month = req.query.month;
  if (!isValidMonth(month)) {
    return res.status(400).json({ error: 'Query param "month" (YYYY-MM) is required.' });
  }
  res.json(getHabitsForMonth(month));
});

habitsRouter.post('/', (req, res) => {
  const { name, goal, fullMonth = false } = req.body ?? {};
  if (typeof fullMonth !== 'boolean') {
    return res.status(400).json({ error: 'fullMonth must be a boolean.' });
  }
  // A Full Month habit doesn't need a numeric goal; one is still kept for if it's turned off.
  const goalRequired = !fullMonth || goal !== undefined;
  if (!isNonEmptyString(name) || (goalRequired && !isPositiveInt(goal))) {
    return res.status(400).json({ error: 'name (string) and goal (positive integer) are required.' });
  }

  const trimmedName = name.trim();
  const color = colorForIndex(habitSequence.get()?.seq ?? 0);
  const { maxPos } = maxPosition.get();
  const position = (maxPos ?? 0) + 1;
  const today = todayIST();
  const month = currentMonthIST();
  const storedGoal = goal ?? daysInMonth(month);

  const createTx = db.transaction(() => {
    const info = insertHabit.run(trimmedName, color, position, today, Date.now());
    insertGoal.run(info.lastInsertRowid, month, storedGoal, fullMonth ? 1 : 0);
    return info.lastInsertRowid;
  });

  const id = createTx();
  res.status(201).json({ id });
});

habitsRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const habit = selectHabitById.get(id);
  if (!habit) return res.status(404).json({ error: 'Habit not found.' });

  const { name, goal, fullMonth, month } = req.body ?? {};

  if (name !== undefined && !isNonEmptyString(name)) {
    return res.status(400).json({ error: 'name must be a non-empty string.' });
  }
  if (goal !== undefined && (!isPositiveInt(goal) || !isValidMonth(month))) {
    return res.status(400).json({ error: 'goal (positive integer) and month (YYYY-MM) are required together.' });
  }
  if (fullMonth !== undefined && (typeof fullMonth !== 'boolean' || !isValidMonth(month))) {
    return res.status(400).json({ error: 'fullMonth (boolean) and month (YYYY-MM) are required together.' });
  }

  db.transaction(() => {
    if (name !== undefined) updateHabitName.run(name.trim(), id);
    if (goal !== undefined || fullMonth !== undefined) setTargetForMonth(id, month, { goal, fullMonth });
  })();

  res.json({ ok: true });
});

habitsRouter.post('/:id/archive', (req, res) => {
  const id = Number(req.params.id);
  const habit = selectHabitById.get(id);
  if (!habit) return res.status(404).json({ error: 'Habit not found.' });
  if (habit.archived_date) return res.status(400).json({ error: 'Habit is already archived.' });

  archiveHabit.run(todayIST(), id);
  res.json({ ok: true });
});

habitsRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const habit = selectHabitById.get(id);
  if (!habit) return res.status(404).json({ error: 'Habit not found.' });

  deleteHabit.run(id);
  res.json({ ok: true });
});

habitsRouter.patch('/reorder/all', (req, res) => {
  const { orderedIds } = req.body ?? {};
  if (!Array.isArray(orderedIds) || orderedIds.some((v) => !Number.isInteger(v))) {
    return res.status(400).json({ error: 'orderedIds must be an array of habit ids.' });
  }

  const allHabits = selectAllHabitsOrdered.all();
  const activeIds = new Set(allHabits.filter((h) => !h.archived_date).map((h) => h.id));
  const providedSet = new Set(orderedIds);
  if (
    orderedIds.length === 0 ||
    providedSet.size !== orderedIds.length ||
    orderedIds.some((id) => !activeIds.has(id))
  ) {
    return res.status(400).json({ error: 'orderedIds must be distinct active habit ids.' });
  }

  // The grid only sends the active habits it shows, which for a past month leaves out
  // habits created later. The given habits swap among the slots they already hold, so
  // hidden and archived habits keep their place. Every habit is then renumbered so
  // positions stay unique.
  let cursor = 0;
  const nextOrder = allHabits.map((h) => (providedSet.has(h.id) ? orderedIds[cursor++] : h.id));

  const reorderTx = db.transaction(() => {
    nextOrder.forEach((id, index) => {
      updatePosition.run(index + 1, id);
    });
  });
  reorderTx();

  res.json({ ok: true });
});

habitsRouter.post('/:id/checks/:date/toggle', (req, res) => {
  const id = Number(req.params.id);
  const { date } = req.params;
  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'date must be a real date in YYYY-MM-DD format.' });
  }

  const habit = selectHabitById.get(id);
  if (!habit) return res.status(404).json({ error: 'Habit not found.' });

  if (!isDateEditable(habit, date)) {
    return res.status(403).json({ error: 'This day is not editable for this habit.' });
  }

  const existing = db.prepare('SELECT id FROM checks WHERE habit_id = ? AND date = ?').get(id, date);
  if (existing) {
    db.prepare('DELETE FROM checks WHERE id = ?').run(existing.id);
    res.json({ checked: false });
  } else {
    db.prepare('INSERT INTO checks (habit_id, date) VALUES (?, ?)').run(id, date);
    res.json({ checked: true });
  }
});
