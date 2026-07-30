import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { NoteCard } from './NoteCard.jsx';

export function NoteGroup({ notes, onSave, onDelete, onTogglePin, onReorder }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const ids = notes.map((n) => n.id);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onSave={(content) => onSave(note.id, content)}
              onDelete={() => onDelete(note)}
              onTogglePin={(pinned) => onTogglePin(note.id, pinned)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
