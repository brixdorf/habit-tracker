import { useState } from 'react';

export function GoalCell({ goal, storedGoal, fullMonth, disabled, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(storedGoal));

  if (disabled) {
    return <span className="text-base-500">–</span>;
  }

  // A Full Month goal is every active day, so it isn't edited here; the habit's edit
  // dialog turns Full Month off to go back to a numeric goal.
  if (fullMonth) {
    const label = `Full Month: every day, ${goal} ${goal === 1 ? 'day' : 'days'} this month`;
    return (
      <span
        aria-label={label}
        title={label}
        className="inline-flex items-center justify-center gap-0.5 px-1 py-0.5 text-xs font-medium text-accent-600 dark:text-accent-400"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
        {goal}
      </span>
    );
  }

  if (editing) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(value);
          if (Number.isInteger(n) && n > 0) {
            onSave(n);
          }
          setEditing(false);
        }}
      >
        <input
          autoFocus
          type="number"
          min="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={(e) => {
            const n = Number(e.target.value);
            if (Number.isInteger(n) && n > 0) onSave(n);
            setEditing(false);
          }}
          className="w-12 rounded border border-accent-500 bg-base-50 px-1 py-0.5 text-center text-xs outline-none dark:bg-base-950"
        />
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(String(storedGoal));
        setEditing(true);
      }}
      title="Click to edit this month's goal"
      className="w-full rounded px-1 py-0.5 text-xs text-base-700 hover:bg-base-200 dark:text-base-300 dark:hover:bg-base-800"
    >
      {goal}
    </button>
  );
}
