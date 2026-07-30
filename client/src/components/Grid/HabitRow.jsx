import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HabitRowCells } from './HabitRowCells.jsx';

export function HabitRow({ habit, days, today, isCurrentMonth, sortable, ...cellCallbacks }) {
  const archived = Boolean(habit.archivedDate);
  const sortableResult = useSortable({ id: habit.id, disabled: !sortable });

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    sortableResult;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={
        'group ' +
        (isDragging ? 'relative z-30 bg-base-100 opacity-90 dark:bg-base-900' : archived ? 'opacity-70' : '')
      }
    >
      <HabitRowCells
        habit={habit}
        days={days}
        today={today}
        isCurrentMonth={isCurrentMonth}
        dragHandleProps={sortable ? { attributes, listeners, setActivatorNodeRef } : {}}
        {...cellCallbacks}
      />
    </tr>
  );
}
