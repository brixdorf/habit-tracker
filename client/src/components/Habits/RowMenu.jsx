import { useEffect, useRef, useState } from 'react';

export function RowMenu({ archived, onEdit, onArchive, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Habit options"
        className="rounded p-1 text-base-400 hover:bg-base-200 hover:text-base-700 dark:hover:bg-base-800 dark:hover:text-base-200"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-base-200 bg-base-50 py-1 text-sm shadow-md dark:border-base-700 dark:bg-base-900">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="block w-full px-3 py-1.5 text-left text-base-700 hover:bg-base-200 dark:text-base-300 dark:hover:bg-base-800"
          >
            Edit
          </button>
          {!archived && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onArchive();
              }}
              className="block w-full px-3 py-1.5 text-left text-base-700 hover:bg-base-200 dark:text-base-300 dark:hover:bg-base-800"
            >
              Archive
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
