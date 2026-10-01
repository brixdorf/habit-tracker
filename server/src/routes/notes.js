import { Router } from 'express';
import { db } from '../db.js';
import { isValidMonth } from '../dateUtils.js';

export const notesRouter = Router();

const selectNotesForMonth = db.prepare(`
  SELECT * FROM notes WHERE month = ? ORDER BY pinned DESC, position DESC
`);
const selectNoteById = db.prepare('SELECT * FROM notes WHERE id = ?');
const maxPositionInGroup = db.prepare(
  'SELECT MAX(position) AS maxPos FROM notes WHERE month = ? AND pinned = ?'
);
const insertNote = db.prepare(`
  INSERT INTO notes (month, content, pinned, position, created_at) VALUES (?, ?, 0, ?, ?)
`);
const updateNoteContent = db.prepare('UPDATE notes SET content = ? WHERE id = ?');
const updateNotePin = db.prepare('UPDATE notes SET pinned = ?, position = ? WHERE id = ?');
const deleteNote = db.prepare('DELETE FROM notes WHERE id = ?');
const updateNotePosition = db.prepare('UPDATE notes SET position = ? WHERE id = ?');
const selectGroupIds = db.prepare(
  'SELECT id FROM notes WHERE month = ? AND pinned = ? ORDER BY position DESC'
);

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

notesRouter.get('/', (req, res) => {
  const month = req.query.month;
  if (!isValidMonth(month)) {
    return res.status(400).json({ error: 'Query param "month" (YYYY-MM) is required.' });
  }
  const notes = selectNotesForMonth.all(month).map((n) => ({
    id: n.id,
    month: n.month,
    content: n.content,
    pinned: Boolean(n.pinned),
    position: n.position,
    createdAt: n.created_at,
  }));
  res.json(notes);
});

notesRouter.post('/', (req, res) => {
  const { month, content } = req.body ?? {};
  if (!isValidMonth(month) || !isNonEmptyString(content)) {
    return res.status(400).json({ error: 'month (YYYY-MM) and content are required.' });
  }

  const { maxPos } = maxPositionInGroup.get(month, 0);
  const position = (maxPos ?? 0) + 1;
  const info = insertNote.run(month, content.trim(), position, Date.now());
  res.status(201).json({ id: info.lastInsertRowid });
});

notesRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const note = selectNoteById.get(id);
  if (!note) return res.status(404).json({ error: 'Note not found.' });

  const { content } = req.body ?? {};
  if (!isNonEmptyString(content)) {
    return res.status(400).json({ error: 'content is required.' });
  }
  updateNoteContent.run(content.trim(), id);
  res.json({ ok: true });
});

notesRouter.patch('/:id/pin', (req, res) => {
  const id = Number(req.params.id);
  const note = selectNoteById.get(id);
  if (!note) return res.status(404).json({ error: 'Note not found.' });

  const { pinned } = req.body ?? {};
  if (typeof pinned !== 'boolean') {
    return res.status(400).json({ error: 'pinned (boolean) is required.' });
  }

  const targetPinned = pinned ? 1 : 0;
  const { maxPos } = maxPositionInGroup.get(note.month, targetPinned);
  const position = (maxPos ?? 0) + 1;
  updateNotePin.run(targetPinned, position, id);
  res.json({ ok: true });
});

notesRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const note = selectNoteById.get(id);
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  deleteNote.run(id);
  res.json({ ok: true });
});

notesRouter.patch('/reorder/group', (req, res) => {
  const { month, pinned, orderedIds } = req.body ?? {};
  if (
    typeof month !== 'string' ||
    typeof pinned !== 'boolean' ||
    !Array.isArray(orderedIds) ||
    orderedIds.some((v) => !Number.isInteger(v))
  ) {
    return res.status(400).json({ error: 'month, pinned, and orderedIds are required.' });
  }

  const existingIds = selectGroupIds.all(month, pinned ? 1 : 0).map((r) => r.id);
  const existingSet = new Set(existingIds);
  const providedSet = new Set(orderedIds);
  if (
    orderedIds.length !== existingSet.size ||
    existingSet.size !== providedSet.size ||
    [...existingSet].some((id) => !providedSet.has(id))
  ) {
    return res.status(400).json({ error: 'orderedIds must contain exactly the notes in this group.' });
  }

  const total = orderedIds.length;
  const reorderTx = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      updateNotePosition.run(total - index, id);
    });
  });
  reorderTx();

  res.json({ ok: true });
});
