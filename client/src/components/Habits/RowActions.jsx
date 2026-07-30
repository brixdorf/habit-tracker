const buttonClass =
  'rounded p-1 text-base-400 hover:bg-base-200 hover:text-base-700 dark:text-base-500 dark:hover:bg-base-800 dark:hover:text-base-200';

export function RowActions({ archived, onEdit, onArchive, onDelete }) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 sm:hidden sm:group-hover:flex">
      <button type="button" onClick={onEdit} title="Edit" aria-label="Edit habit" className={buttonClass}>
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
      {!archived && (
        <button type="button" onClick={onArchive} title="Archive" aria-label="Archive habit" className={buttonClass}>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="4" rx="1" />
            <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
            <path d="M10 12h4" />
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={onDelete}
        title="Delete"
        aria-label="Delete habit"
        className={buttonClass + ' hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-950/40 dark:hover:!text-red-400'}
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" />
        </svg>
      </button>
    </div>
  );
}
