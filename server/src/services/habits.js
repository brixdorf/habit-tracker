import { db } from '../db.js';
import { daysInMonth, dateMonth, compareMonth, currentMonthIST } from '../dateUtils.js';

const selectHabitById = db.prepare('SELECT * FROM habits WHERE id = ?');

const selectVisibleHabits = db.prepare(`
  SELECT * FROM habits
  WHERE substr(created_date, 1, 7) <= ?
    AND (archived_date IS NULL OR substr(archived_date, 1, 7) >= ?)
  ORDER BY position ASC, id ASC
`);

const selectGoalRow = db.prepare('SELECT * FROM habit_goals WHERE habit_id = ? AND month = ?');
const selectLatestPriorGoal = db.prepare(`
  SELECT * FROM habit_goals WHERE habit_id = ? AND month < ? ORDER BY month DESC LIMIT 1
`);
const insertGoalRow = db.prepare(
  'INSERT INTO habit_goals (habit_id, month, goal, full_month) VALUES (?, ?, ?, ?)'
);
const updateGoalRow = db.prepare('UPDATE habit_goals SET goal = ? WHERE habit_id = ? AND month = ?');
const updateFullMonthRow = db.prepare('UPDATE habit_goals SET full_month = ? WHERE habit_id = ? AND month = ?');

const selectCheckedDates = db.prepare(`
  SELECT date FROM checks WHERE habit_id = ? AND substr(date, 1, 7) = ? ORDER BY date ASC
`);

// A month's target is its numeric goal plus whether it is a Full Month. Both are
// stored per month and carry forward from the latest earlier month, like goals.
function resolveTargetForMonth(habitId, month, fallback) {
  const row = selectGoalRow.get(habitId, month) ?? selectLatestPriorGoal.get(habitId, month);
  const target = row ? { goal: row.goal, fullMonth: Boolean(row.full_month) } : fallback;
  return { ...target, stored: row?.month === month };
}

function materializeTargetForMonth(habitId, month, fallback) {
  const target = resolveTargetForMonth(habitId, month, fallback);
  if (!target.stored) insertGoalRow.run(habitId, month, target.goal, target.fullMonth ? 1 : 0);
  return target;
}

// Months that have started get their inherited target saved, so later edits to an
// earlier month don't rewrite them. Future months only preview the inherited target,
// so they keep following changes until they actually begin.
function targetForViewedMonth(habitId, month) {
  const fallback = { goal: 0, fullMonth: false };
  if (compareMonth(month, currentMonthIST()) > 0) {
    return resolveTargetForMonth(habitId, month, fallback);
  }
  return materializeTargetForMonth(habitId, month, fallback);
}

export function computeProration(habit, month) {
  const archivedMonth = habit.archived_date ? dateMonth(habit.archived_date) : null;
  if (archivedMonth !== month) {
    return { activeDays: null, totalDays: null, fullyDisabled: false };
  }
  const totalDays = daysInMonth(month);
  const activeDays = Number(habit.archived_date.slice(8, 10));
  return { activeDays, totalDays, fullyDisabled: activeDays <= 0 };
}

// The days a Full Month habit must be done in a month: from its creation day when it
// was created that month, through its archive day when it was archived that month.
function fullMonthWindow(habit, month) {
  const startDate = dateMonth(habit.created_date) === month ? habit.created_date : `${month}-01`;
  const endDate =
    habit.archived_date && dateMonth(habit.archived_date) === month
      ? habit.archived_date
      : `${month}-${String(daysInMonth(month)).padStart(2, '0')}`;
  const requiredDays = Number(endDate.slice(8, 10)) - Number(startDate.slice(8, 10)) + 1;
  return { startDate, endDate, requiredDays };
}

export function getHabitsForMonth(month) {
  const rows = selectVisibleHabits.all(month, month);

  return rows.map((habit) => {
    const { goal: storedGoal, fullMonth } = targetForViewedMonth(habit.id, month);
    const { activeDays, totalDays, fullyDisabled } = computeProration(habit, month);
    const checkedDates = selectCheckedDates.all(habit.id, month).map((r) => r.date);
    const cutoffDate =
      habit.archived_date && dateMonth(habit.archived_date) === month ? habit.archived_date : null;

    let goal = storedGoal;
    let achieved = checkedDates.length;
    let startDate = null;

    if (fullMonth) {
      const window = fullMonthWindow(habit, month);
      goal = window.requiredDays;
      achieved = checkedDates.filter((d) => d >= window.startDate && d <= window.endDate).length;
      // Only the creation month has locked days at the start.
      if (dateMonth(habit.created_date) === month) startDate = habit.created_date;
    } else if (activeDays !== null) {
      goal = fullyDisabled ? 0 : Math.round(storedGoal * (activeDays / totalDays));
    }

    return {
      id: habit.id,
      name: habit.name,
      color: habit.color,
      position: habit.position,
      createdDate: habit.created_date,
      archivedDate: habit.archived_date,
      goal,
      storedGoal,
      fullMonth,
      achieved,
      checkedDates,
      startDate,
      cutoffDate,
      fullyDisabled,
    };
  });
}

// Sets the numeric goal and/or the Full Month flag for a month; undefined leaves a field as is.
export function setTargetForMonth(habitId, month, { goal, fullMonth }) {
  const habit = selectHabitById.get(habitId);
  if (!habit) throw new Error('Habit not found');

  materializeTargetForMonth(habitId, month, { goal: goal ?? 0, fullMonth: fullMonth ?? false });
  if (goal !== undefined) updateGoalRow.run(goal, habitId, month);
  if (fullMonth !== undefined) updateFullMonthRow.run(fullMonth ? 1 : 0, habitId, month);
}

export function isDateEditable(habit, date) {
  const month = dateMonth(date);
  const creationMonth = dateMonth(habit.created_date);

  if (compareMonth(month, creationMonth) < 0) return false;
  if (habit.archived_date) {
    const archivedMonth = dateMonth(habit.archived_date);
    if (compareMonth(month, archivedMonth) > 0) return false;
    if (month === archivedMonth && date > habit.archived_date) return false;
  }
  // A Full Month habit counts from its creation day, so earlier days in that month are locked.
  if (month === creationMonth && date < habit.created_date) {
    const { fullMonth } = resolveTargetForMonth(habit.id, month, { goal: 0, fullMonth: false });
    if (fullMonth) return false;
  }
  return true;
}

export { selectHabitById };
