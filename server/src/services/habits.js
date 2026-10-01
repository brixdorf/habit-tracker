import { db } from '../db.js';
import { daysInMonth, dateMonth, compareMonth, currentMonthIST } from '../dateUtils.js';

const selectHabitById = db.prepare('SELECT * FROM habits WHERE id = ?');

const selectVisibleHabits = db.prepare(`
  SELECT * FROM habits
  WHERE substr(created_date, 1, 7) <= ?
    AND (archived_date IS NULL OR substr(archived_date, 1, 7) >= ?)
  ORDER BY position ASC
`);

const selectGoalRow = db.prepare('SELECT * FROM habit_goals WHERE habit_id = ? AND month = ?');
const selectLatestPriorGoal = db.prepare(`
  SELECT * FROM habit_goals WHERE habit_id = ? AND month < ? ORDER BY month DESC LIMIT 1
`);
const insertGoalRow = db.prepare('INSERT INTO habit_goals (habit_id, month, goal) VALUES (?, ?, ?)');
const updateGoalRow = db.prepare('UPDATE habit_goals SET goal = ? WHERE habit_id = ? AND month = ?');

const selectCheckedDates = db.prepare(`
  SELECT date FROM checks WHERE habit_id = ? AND substr(date, 1, 7) = ? ORDER BY date ASC
`);

function resolveGoalForMonth(habitId, month, fallbackGoal) {
  const row = selectGoalRow.get(habitId, month);
  if (row) return { goal: row.goal, stored: true };

  const prior = selectLatestPriorGoal.get(habitId, month);
  return { goal: prior ? prior.goal : fallbackGoal, stored: false };
}

function materializeGoalForMonth(habitId, month, fallbackGoal) {
  const { goal, stored } = resolveGoalForMonth(habitId, month, fallbackGoal);
  if (!stored) insertGoalRow.run(habitId, month, goal);
  return goal;
}

// Months that have started get their inherited goal saved, so later edits to an
// earlier month don't rewrite them. Future months only preview the inherited goal,
// so they keep following changes until they actually begin.
function goalForViewedMonth(habitId, month) {
  if (compareMonth(month, currentMonthIST()) > 0) {
    return resolveGoalForMonth(habitId, month, 0).goal;
  }
  return materializeGoalForMonth(habitId, month, 0);
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

export function getHabitsForMonth(month) {
  const rows = selectVisibleHabits.all(month, month);

  return rows.map((habit) => {
    const storedGoal = goalForViewedMonth(habit.id, month);
    const { activeDays, totalDays, fullyDisabled } = computeProration(habit, month);

    let goal = storedGoal;
    if (activeDays !== null) {
      goal = fullyDisabled ? 0 : Math.round(storedGoal * (activeDays / totalDays));
    }

    const checkedDates = selectCheckedDates.all(habit.id, month).map((r) => r.date);
    const cutoffDate =
      habit.archived_date && dateMonth(habit.archived_date) === month ? habit.archived_date : null;

    return {
      id: habit.id,
      name: habit.name,
      color: habit.color,
      position: habit.position,
      createdDate: habit.created_date,
      archivedDate: habit.archived_date,
      goal,
      storedGoal,
      achieved: checkedDates.length,
      checkedDates,
      cutoffDate,
      fullyDisabled,
    };
  });
}

export function setGoalForMonth(habitId, month, goal) {
  const habit = selectHabitById.get(habitId);
  if (!habit) throw new Error('Habit not found');

  materializeGoalForMonth(habitId, month, goal);
  const result = updateGoalRow.run(goal, habitId, month);
  if (result.changes === 0) {
    insertGoalRow.run(habitId, month, goal);
  }
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
  return true;
}

export { selectHabitById };
