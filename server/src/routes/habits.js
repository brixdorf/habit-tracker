import { Router } from 'express';
import { db } from '../db.js';
import { todayIST, currentMonthIST } from '../dateUtils.js';
import { colorForIndex } from '../services/color.js';
import { getHabitsForMonth, setGoalForMonth, selectHabitById, isDateEditable } from '../services/habits.js';

export const habitsRouter = Router();

const countAllHabits = db.prepare('SELECT COUNT(*) AS count FROM habits');
const maxPosition = db.prepare('SELECT MAX(position) AS maxPos FROM habits');
const insertHabit = db.prepare(`
  INSERT INTO habits (name, color, position, created_date, archived_date, created_at)
  VALUES (?, ?, ?, ?, NULL, ?)
`);
const insertGoal = db.prepare('INSERT INTO habit_goals (habit_id, month, goal) VALUES (?, ?, ?)');
const updateHabitName = db.prepare('UPDATE habits SET name = ? WHERE id = ?');
const archiveHabit = db.prepare('UPDATE habits SET archived_date = ? WHERE id = ?');
const deleteHabit = db.prepare('DELETE FROM habits WHERE id = ?');
const selectActiveHabitsOrdered = db.prepare(
  'SELECT id FROM habits WHERE archived_date IS NULL ORDER BY position ASC'
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
  if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'Query param "month" (YYYY-MM) is required.' });
  }
  res.json(getHabitsForMonth(month));
});

habitsRouter.post('/', (req, res) => {
  const { name, goal } = req.body ?? {};
  if (!isNonEmptyString(name) || !isPositiveInt(goal)) {
    return res.status(400).json({ error: 'name (string) and goal (positive integer) are required.' });
  }

  const trimmedName = name.trim();
  const { count } = countAllHabits.get();
  const color = colorForIndex(count);
  const { maxPos } = maxPosition.get();
  const position = (maxPos ?? 0) + 1;
  const today = todayIST();
  const month = currentMonthIST();

  const createTx = db.transaction(() => {
    const info = insertHabit.run(trimmedName, color, position, today, Date.now());
    insertGoal.run(info.lastInsertRowid, month, goal);
    return info.lastInsertRowid;
  });

  const id = createTx();
  res.status(201).json({ id });
});

habitsRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const habit = selectHabitById.get(id);
  if (!habit) return res.status(404).json({ error: 'Habit not found.' });

  const { name, goal, month } = req.body ?? {};

  if (name !== undefined) {
    if (!isNonEmptyString(name)) {
      return res.status(400).json({ error: 'name must be a non-empty string.' });
    }
    updateHabitName.run(name.trim(), id);
  }

  if (goal !== undefined) {
    if (!isPositiveInt(goal) || typeof month !== 'string') {
      return res.status(400).json({ error: 'goal (positive integer) and month are required together.' });
    }
    setGoalForMonth(id, month, goal);
  }

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

  const activeIds = new Set(selectActiveHabitsOrdered.all().map((r) => r.id));
  const providedSet = new Set(orderedIds);
  if (activeIds.size !== providedSet.size || [...activeIds].some((id) => !providedSet.has(id))) {
    return res.status(400).json({ error: 'orderedIds must contain exactly the active habit ids.' });
  }

  const reorderTx = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      updatePosition.run(index + 1, id);
    });
  });
  reorderTx();

  res.json({ ok: true });
});

habitsRouter.post('/:id/checks/:date/toggle', (req, res) => {
  const id = Number(req.params.id);
  const { date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format.' });
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
