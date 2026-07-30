import { useCallback, useEffect, useState } from 'react';
import { Logo } from '../components/common/Logo.jsx';
import { ThemeToggle } from '../components/common/ThemeToggle.jsx';
import { MonthNav } from '../components/common/MonthNav.jsx';
import { ImportExportBar } from '../components/common/ImportExportBar.jsx';
import { ConfirmDialog } from '../components/common/ConfirmDialog.jsx';
import { HabitGrid } from '../components/Grid/HabitGrid.jsx';
import { HabitFormModal } from '../components/Habits/HabitFormModal.jsx';
import { NotesPanel } from '../components/Notes/NotesPanel.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../api.js';
import { monthToDates, addMonths } from '../utils/dates.js';

export function Dashboard() {
  const { logout } = useAuth();
  const [today, setToday] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(null);
  const [month, setMonth] = useState(null);
  const [habits, setHabits] = useState([]);
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState('');

  const [showCreateHabit, setShowCreateHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [archivingHabit, setArchivingHabit] = useState(null);
  const [deletingHabit, setDeletingHabit] = useState(null);
  const [deletingNote, setDeletingNote] = useState(null);

  useEffect(() => {
    api.getToday().then(({ today, month }) => {
      setToday(today);
      setCurrentMonth(month);
      setMonth(month);
    });
  }, []);

  const refresh = useCallback((m) => {
    if (!m) return;
    api.getHabits(m).then(setHabits).catch((e) => setError(e.message));
    api.getNotes(m).then(setNotes).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    refresh(month);
  }, [month, refresh]);

  if (!month) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base-50 dark:bg-base-950">
        <p className="text-base-500 dark:text-base-400">Loading…</p>
      </div>
    );
  }

  const days = monthToDates(month);
  const isCurrentMonth = month === currentMonth;

  async function handleToggle(habitId, date) {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const checked = h.checkedDates.includes(date);
        const checkedDates = checked ? h.checkedDates.filter((d) => d !== date) : [...h.checkedDates, date];
        return { ...h, checkedDates, achieved: checkedDates.length };
      })
    );
    try {
      await api.toggleCheck(habitId, date);
    } catch (e) {
      setError(e.message);
      refresh(month);
    }
  }

  async function handleSaveGoal(habitId, goal) {
    try {
      await api.updateHabit(habitId, { goal, month });
      refresh(month);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleCreateHabit({ name, goal }) {
    await api.createHabit(name, goal);
    setShowCreateHabit(false);
    refresh(month);
  }

  async function handleEditHabit({ name, goal }) {
    await api.updateHabit(editingHabit.id, { name, goal, month });
    setEditingHabit(null);
    refresh(month);
  }

  async function handleConfirmArchive() {
    try {
      await api.archiveHabit(archivingHabit.id);
      setArchivingHabit(null);
      refresh(month);
    } catch (e) {
      setError(e.message);
      setArchivingHabit(null);
    }
  }

  async function handleConfirmDelete() {
    try {
      await api.deleteHabit(deletingHabit.id);
      setDeletingHabit(null);
      refresh(month);
    } catch (e) {
      setError(e.message);
      setDeletingHabit(null);
    }
  }

  async function handleReorder(orderedIds) {
    try {
      await api.reorderHabits(orderedIds);
    } catch (e) {
      setError(e.message);
      refresh(month);
    }
  }

  async function handleCreateNote(content) {
    await api.createNote(month, content);
    refresh(month);
  }

  async function handleSaveNote(id, content) {
    try {
      await api.updateNote(id, content);
      refresh(month);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleConfirmDeleteNote() {
    try {
      await api.deleteNote(deletingNote.id);
      setDeletingNote(null);
      refresh(month);
    } catch (e) {
      setError(e.message);
      setDeletingNote(null);
    }
  }

  async function handleTogglePinNote(id, pinned) {
    try {
      await api.pinNote(id, pinned);
      refresh(month);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleReorderNotes(pinned, orderedIds) {
    try {
      await api.reorderNotes(month, pinned, orderedIds);
    } catch (e) {
      setError(e.message);
      refresh(month);
    }
  }

  return (
    <div className="min-h-screen bg-base-50 dark:bg-base-950">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 px-4 py-3 dark:border-base-800">
        <div className="flex items-center gap-2">
          <Logo />
          <h1 className="text-lg font-semibold text-base-900 dark:text-base-100">Habit Tracker</h1>
        </div>
        <MonthNav
          month={month}
          onPrev={() => setMonth((m) => addMonths(m, -1))}
          onNext={() => setMonth((m) => addMonths(m, 1))}
        />
        <div className="flex items-center gap-2">
          <ImportExportBar onImported={() => refresh(month)} />
          <ThemeToggle />
          <button
            onClick={logout}
            className="rounded-md border border-base-300 px-3 py-1.5 text-sm text-base-700 hover:bg-base-200 dark:border-base-700 dark:text-base-300 dark:hover:bg-base-800"
          >
            Log out
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
          <button className="ml-3 underline" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      )}

      <main className="flex flex-col gap-8 p-4">
        <HabitGrid
          habits={habits}
          days={days}
          today={today}
          isCurrentMonth={isCurrentMonth}
          onToggle={handleToggle}
          onSaveGoal={handleSaveGoal}
          onEdit={(h) => setEditingHabit(h)}
          onArchive={(h) => setArchivingHabit(h)}
          onDelete={(h) => setDeletingHabit(h)}
          onReorder={handleReorder}
          onNewHabit={() => setShowCreateHabit(true)}
        />

        <NotesPanel
          notes={notes}
          onCreate={handleCreateNote}
          onSave={handleSaveNote}
          onDelete={(n) => setDeletingNote(n)}
          onTogglePin={handleTogglePinNote}
          onReorder={handleReorderNotes}
        />
      </main>

      {showCreateHabit && (
        <HabitFormModal mode="create" onSubmit={handleCreateHabit} onClose={() => setShowCreateHabit(false)} />
      )}

      {editingHabit && (
        <HabitFormModal
          mode="edit"
          initialName={editingHabit.name}
          initialGoal={editingHabit.storedGoal}
          onSubmit={handleEditHabit}
          onClose={() => setEditingHabit(null)}
        />
      )}

      {archivingHabit && (
        <ConfirmDialog
          title="Archive habit?"
          message={`"${archivingHabit.name}" will stop appearing in future months. This cannot be undone.`}
          confirmLabel="Archive"
          danger
          onConfirm={handleConfirmArchive}
          onCancel={() => setArchivingHabit(null)}
        />
      )}

      {deletingHabit && (
        <ConfirmDialog
          title="Delete habit?"
          message={`This will permanently delete "${deletingHabit.name}" and all of its historical check data. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingHabit(null)}
        />
      )}

      {deletingNote && (
        <ConfirmDialog
          title="Delete note?"
          message="This note will be permanently deleted."
          confirmLabel="Delete"
          danger
          onConfirm={handleConfirmDeleteNote}
          onCancel={() => setDeletingNote(null)}
        />
      )}
    </div>
  );
}
