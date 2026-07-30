import { useState } from 'react';
import { NoteGroup } from './NoteGroup.jsx';

export function NotesPanel({ notes, onCreate, onSave, onDelete, onTogglePin, onReorder }) {
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  const pinned = notes.filter((n) => n.pinned);
  const unpinned = notes.filter((n) => !n.pinned);

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    setAdding(true);
    try {
      await onCreate(trimmed);
      setDraft('');
    } finally {
      setAdding(false);
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-base-500 dark:text-base-400">
        Notes
      </h2>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a note for this month…"
          className="flex-1 rounded-md border border-base-300 bg-base-50 px-3 py-2 text-sm text-base-900 outline-none focus:border-accent-500 dark:border-base-700 dark:bg-base-950 dark:text-base-100"
        />
        <button
          type="submit"
          disabled={adding || !draft.trim()}
          className="rounded-md bg-accent-500 px-3 py-2 text-sm font-medium text-base-50 hover:bg-accent-600 disabled:opacity-60"
        >
          Add
        </button>
      </form>

      {notes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-base-300 bg-base-100/50 p-6 text-center text-sm text-base-500 dark:border-base-700 dark:bg-base-900/40 dark:text-base-400">
          No notes for this month yet. Add one above to get started.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {pinned.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-base-400 dark:text-base-500">
                Pinned
              </p>
              <NoteGroup
                notes={pinned}
                onSave={onSave}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
                onReorder={(orderedIds) => onReorder(true, orderedIds)}
              />
            </div>
          )}
          <NoteGroup
            notes={unpinned}
            onSave={onSave}
            onDelete={onDelete}
            onTogglePin={onTogglePin}
            onReorder={(orderedIds) => onReorder(false, orderedIds)}
          />
        </div>
      )}
    </section>
  );
}
