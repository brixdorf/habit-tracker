import { useState } from 'react';

export function GoalCell({ goal, storedGoal, disabled, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(storedGoal));

  if (disabled) {
    return <span className="text-base-500">–</span>;
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
