import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function NoteCard({ note, onSave, onDelete, onTogglePin }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  function handleSave() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== note.content) {
      onSave(trimmed);
    }
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        'rounded-md border border-base-200 bg-base-100 p-3 dark:border-base-800 dark:bg-base-900 ' +
        (isDragging ? 'relative z-10 opacity-90 shadow-md' : '')
      }
    >
      <div className="mb-2 flex items-start gap-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-base-500 hover:text-base-700 active:cursor-grabbing dark:text-base-500 dark:hover:text-base-300"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <circle cx="9" cy="6" r="1.3" />
            <circle cx="15" cy="6" r="1.3" />
            <circle cx="9" cy="12" r="1.3" />
            <circle cx="15" cy="12" r="1.3" />
            <circle cx="9" cy="18" r="1.3" />
            <circle cx="15" cy="18" r="1.3" />
          </svg>
        </button>

        {editing ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full resize-none rounded border border-accent-500 bg-base-50 p-2 text-sm text-base-900 outline-none dark:bg-base-950 dark:text-base-100"
          />
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm text-base-800 dark:text-base-200">
            {note.content}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-1 text-base-500 dark:text-base-400">
        <button
          type="button"
          onClick={() => onTogglePin(!note.pinned)}
          title={note.pinned ? 'Unpin' : 'Pin'}
          className={
            'rounded p-1 hover:bg-base-200 dark:hover:bg-base-800 ' +
            (note.pinned ? 'text-accent-500' : '')
          }
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill={note.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4-1-6Z" strokeLinejoin="round" />
          </svg>
        </button>
        {editing ? (
          <>
            <button
              type="button"
              onClick={() => {
                setDraft(note.content);
                setEditing(false);
              }}
              className="rounded px-2 py-1 text-xs hover:bg-base-200 dark:hover:bg-base-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded bg-accent-500 px-2 py-1 text-xs font-medium text-base-50 hover:bg-accent-600"
            >
              Save
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            title="Edit"
            className="rounded p-1 hover:bg-base-200 dark:hover:bg-base-800"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          className="rounded p-1 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
