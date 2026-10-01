import { GoalCell } from './GoalCell.jsx';
import { RowActions } from '../Habits/RowActions.jsx';

function DragHandle({ attributes, listeners, setActivatorNodeRef }) {
  if (!listeners) return <span className="inline-block h-4 w-4" />;
  return (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder"
      className="cursor-grab touch-none text-base-500 hover:text-base-700 active:cursor-grabbing dark:text-base-500 dark:hover:text-base-300"
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
  );
}

export function HabitRowCells({
  habit,
  days,
  today,
  isCurrentMonth,
  dragHandleProps,
  onToggle,
  onSaveGoal,
  onEdit,
  onArchive,
  onDelete,
}) {
  const archived = Boolean(habit.archivedDate);
  const checkedSet = new Set(habit.checkedDates);

  return (
    <>
      <td className="sticky left-0 z-10 w-44 border-b border-base-200 bg-base-50 px-2 py-1.5 dark:border-base-800 dark:bg-base-950">
        <div className="flex h-6 items-center gap-1.5">
          <DragHandle {...dragHandleProps} />
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: habit.color }}
            aria-hidden="true"
          />
          <span
            className={
              'min-w-0 flex-1 truncate text-sm ' +
              'text-base-800 dark:text-base-100'
            }
            title={habit.name}
          >
            {habit.name}
          </span>
          <RowActions archived={archived} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} />
        </div>
      </td>

      {days.map((date) => {
        const isToday = isCurrentMonth && date === today;
        const editable =
          !habit.fullyDisabled &&
          (!habit.startDate || date >= habit.startDate) &&
          (!habit.cutoffDate || date <= habit.cutoffDate);
        const checked = checkedSet.has(date);

        return (
          <td
            key={date}
            className={
              'border-b border-base-200 p-0.5 text-center dark:border-base-800 ' +
              (isToday && !checked ? 'bg-accent-500/10' : '')
            }
          >
            <button
              type="button"
              disabled={!editable}
              onClick={() => onToggle(date)}
              aria-label={`${habit.name} on ${date}${checked ? ', checked' : ''}`}
              aria-pressed={checked}
              style={checked ? { backgroundColor: habit.color } : undefined}
              className={
                'inline-flex h-7 w-7 items-center justify-center rounded align-middle transition ' +
                (checked
                  ? editable
                    ? 'cursor-pointer'
                    : 'cursor-default opacity-60'
                  : editable
                    ? 'cursor-pointer hover:bg-base-200 dark:hover:bg-base-800'
                    : 'cursor-default opacity-40')
              }
            >
              {checked && (
                <svg viewBox="0 0 24 24" className="h-4 w-4 translate-x-px" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 13 4 4L19 7" />
                </svg>
              )}
            </button>
          </td>
        );
      })}

      <td className="sticky right-11 z-10 w-11 border-b border-base-200 bg-base-50 text-center text-xs sm:right-14 sm:w-14 dark:border-base-800 dark:bg-base-950">
        <GoalCell
          goal={habit.goal}
          storedGoal={habit.storedGoal}
          fullMonth={habit.fullMonth}
          disabled={habit.fullyDisabled}
          onSave={(n) => onSaveGoal(n)}
        />
      </td>
      <td className="sticky right-0 z-10 w-11 border-b border-base-200 bg-base-50 p-0.5 text-center sm:w-14 dark:border-base-800 dark:bg-base-950">
        <span
          aria-label={
            habit.fullyDisabled
              ? 'Not tracked this month'
              : `${habit.achieved} of ${habit.goal} done${habit.achieved >= habit.goal ? ', goal met' : ''}`
          }
          className={
            'inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-sm font-medium ' +
            (habit.fullyDisabled
              ? 'text-base-500'
              : habit.achieved >= habit.goal
                ? 'bg-success-600 text-white'
                : 'bg-warning-600 text-white')
          }
        >
          {habit.fullyDisabled ? '–' : habit.achieved}
        </span>
      </td>
    </>
  );
}
