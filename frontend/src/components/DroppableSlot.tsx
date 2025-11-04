// In frontend/src/components/DroppableSlot.tsx
import { useDroppable } from '@dnd-kit/core';
import { Box } from '@mantine/core';

export function DroppableSlot({
  id,
  onSlotClick,
}: {
  id: string;
  onSlotClick: (id: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <Box
      ref={setNodeRef}
      onClick={() => onSlotClick(id)}
      style={{
        width: '100%',
        height: 40,
        border: '1px dashed #444',
        backgroundColor: isOver ? '#333' : 'transparent',
        borderRadius: 4,
        cursor: 'pointer',
      }}
    />
  );
}
