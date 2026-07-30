import { formatMonthLabel } from '../../utils/dates.js';

export function MonthNav({ month, onPrev, onNext }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous month"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-base-300 text-base-600 hover:bg-base-200 dark:border-base-700 dark:text-base-300 dark:hover:bg-base-800"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>
      <span className="min-w-32 text-center text-sm font-medium text-base-800 dark:text-base-100">
        {formatMonthLabel(month)}
      </span>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next month"
        className="flex h-8 w-8 items-center justify-center rounded-md border border-base-300 text-base-600 hover:bg-base-200 dark:border-base-700 dark:text-base-300 dark:hover:bg-base-800"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
