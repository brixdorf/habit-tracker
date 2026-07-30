import { useState } from 'react';
import { Modal } from '../common/Modal.jsx';

export function HabitFormModal({ initialName = '', initialGoal = '', mode, onSubmit, onClose }) {
  const [name, setName] = useState(initialName);
  const [goal, setGoal] = useState(String(initialGoal));
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const goalNumber = Number(goal);

    if (!trimmedName) {
      setError('Please enter a habit name.');
      return;
    }
    if (!Number.isInteger(goalNumber) || goalNumber <= 0) {
      setError('Goal must be a positive whole number.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ name: trimmedName, goal: goalNumber });
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setSubmitting(false);
    }
  }

  return (
    <Modal title={mode === 'edit' ? 'Edit habit' : 'New habit'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-base-700 dark:text-base-300">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full rounded-md border border-base-300 bg-base-50 px-3 py-2 text-base-900 outline-none focus:border-accent-500 dark:border-base-700 dark:bg-base-950 dark:text-base-100"
          />
        </div>
        <div className="mb-5">
          <label className="mb-1 block text-sm font-medium text-base-700 dark:text-base-300">
            Monthly goal (days)
          </label>
          <input
            type="number"
            min="1"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full rounded-md border border-base-300 bg-base-50 px-3 py-2 text-base-900 outline-none focus:border-accent-500 dark:border-base-700 dark:bg-base-950 dark:text-base-100"
          />
        </div>
        {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-base-300 px-3 py-1.5 text-sm text-base-700 hover:bg-base-200 dark:border-base-700 dark:text-base-300 dark:hover:bg-base-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-base-50 hover:bg-accent-600 disabled:opacity-60"
          >
            {mode === 'edit' ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
