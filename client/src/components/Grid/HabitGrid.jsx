import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { HabitRow } from './HabitRow.jsx';
import { weekdayAbbrev, dayNumber } from '../../utils/dates.js';

export function HabitGrid({
  habits,
  days,
  today,
  isCurrentMonth,
  onToggle,
  onSaveGoal,
  onEdit,
  onArchive,
  onDelete,
  onReorder,
  onNewHabit,
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const activeIds = habits.filter((h) => !h.archivedDate).map((h) => h.id);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeIds.indexOf(active.id);
    const newIndex = activeIds.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newActiveOrder = arrayMove(activeIds, oldIndex, newIndex);

    const fullOrder = habits.map((h) => h.id);
    const activeIdSet = new Set(activeIds);
    let activeCursor = 0;
    const nextOrder = fullOrder.map((id) => (activeIdSet.has(id) ? newActiveOrder[activeCursor++] : id));

    onReorder(nextOrder);
  }

  if (habits.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-base-300 bg-base-100/50 p-10 text-center dark:border-base-700 dark:bg-base-900/40">
        <p className="mb-4 text-base-600 dark:text-base-400">
          No habits yet. Create your first habit by clicking on{' '}
          <span className="font-medium text-base-700 dark:text-base-200">+ New Habit</span>.
        </p>
        <button
          type="button"
          onClick={onNewHabit}
          className="rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-base-50 hover:bg-accent-600"
        >
          + New Habit
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={onNewHabit}
          className="rounded-md bg-accent-500 px-3 py-1.5 text-sm font-medium text-base-50 hover:bg-accent-600"
        >
          + New Habit
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-base-200 dark:border-base-800">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-44" />
              {days.map((d) => (
                <col key={d} className="w-8" />
              ))}
              <col className="w-11 sm:w-14" />
              <col className="w-11 sm:w-14" />
            </colgroup>
            <thead>
              <tr>
                <th className="sticky left-0 z-20 w-44 border-b border-base-200 bg-base-100 px-2 py-2 text-left text-xs font-medium uppercase tracking-wide text-base-500 dark:border-base-800 dark:bg-base-900 dark:text-base-400">
                  Habit
                </th>
                {days.map((date) => {
                  const isToday = isCurrentMonth && date === today;
                  return (
                    <th
                      key={date}
                      className={
                        'border-b border-base-200 py-2 text-center text-[10px] font-medium leading-tight text-base-500 dark:border-base-800 dark:text-base-400 ' +
                        (isToday ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400' : '')
                      }
                    >
                      <div>{weekdayAbbrev(date)}</div>
                      <div>{dayNumber(date)}</div>
                    </th>
                  );
                })}
                <th className="sticky right-11 z-20 w-11 border-b border-base-200 bg-base-100 text-center text-xs font-medium uppercase tracking-wide text-base-500 sm:right-14 sm:w-14 dark:border-base-800 dark:bg-base-900 dark:text-base-400">
                  Goal
                </th>
                <th className="sticky right-0 z-20 w-11 border-b border-base-200 bg-base-100 text-center text-xs font-medium uppercase tracking-wide text-base-500 sm:w-14 dark:border-base-800 dark:bg-base-900 dark:text-base-400">
                  Done
                </th>
              </tr>
            </thead>
            <tbody>
              <SortableContext items={activeIds} strategy={verticalListSortingStrategy}>
                {habits.map((habit) => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    days={days}
                    today={today}
                    isCurrentMonth={isCurrentMonth}
                    sortable={!habit.archivedDate}
                    onToggle={(date) => onToggle(habit.id, date)}
                    onSaveGoal={(goal) => onSaveGoal(habit.id, goal)}
                    onEdit={() => onEdit(habit)}
                    onArchive={() => onArchive(habit)}
                    onDelete={() => onDelete(habit)}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  );
}
