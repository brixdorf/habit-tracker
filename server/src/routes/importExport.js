import { Router } from 'express';
import { db } from '../db.js';

export const importExportRouter = Router();

const EXPORT_VERSION = 1;

importExportRouter.get('/export', (req, res) => {
  const snapshot = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    habits: db.prepare('SELECT * FROM habits').all(),
    habitGoals: db.prepare('SELECT * FROM habit_goals').all(),
    checks: db.prepare('SELECT * FROM checks').all(),
    notes: db.prepare('SELECT * FROM notes').all(),
  };

  const filename = `habit-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(snapshot, null, 2));
});

function isArray(v) {
  return Array.isArray(v);
}

importExportRouter.post('/import', (req, res) => {
  const snapshot = req.body ?? {};
  if (!isArray(snapshot.habits) || !isArray(snapshot.habitGoals) || !isArray(snapshot.checks) || !isArray(snapshot.notes)) {
    return res.status(400).json({ error: 'Invalid snapshot: expected habits, habitGoals, checks, notes arrays.' });
  }

  const insertHabit = db.prepare(`
    INSERT INTO habits (id, name, color, position, created_date, archived_date, created_at)
    VALUES (@id, @name, @color, @position, @created_date, @archived_date, @created_at)
  `);
  const insertGoal = db.prepare(`
    INSERT INTO habit_goals (id, habit_id, month, goal) VALUES (@id, @habit_id, @month, @goal)
  `);
  const insertCheck = db.prepare(`
    INSERT INTO checks (id, habit_id, date) VALUES (@id, @habit_id, @date)
  `);
  const insertNote = db.prepare(`
    INSERT INTO notes (id, month, content, pinned, position, created_at)
    VALUES (@id, @month, @content, @pinned, @position, @created_at)
  `);

  const importTx = db.transaction(() => {
    db.prepare('DELETE FROM checks').run();
    db.prepare('DELETE FROM habit_goals').run();
    db.prepare('DELETE FROM notes').run();
    db.prepare('DELETE FROM habits').run();

    for (const habit of snapshot.habits) insertHabit.run(habit);
    for (const goal of snapshot.habitGoals) insertGoal.run(goal);
    for (const check of snapshot.checks) insertCheck.run(check);
    for (const note of snapshot.notes) insertNote.run(note);
  });

  try {
    importTx();
  } catch (err) {
    return res.status(400).json({ error: `Import failed: ${err.message}` });
  }

  res.json({ ok: true });
});
