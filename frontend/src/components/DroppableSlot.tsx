// In frontend/src/components/DroppableSlot.tsx
import { useDroppable } from '@dnd-kit/core';
import { Box } from '@mantine/core';

export function DroppableSlot({ id }: { id: string }) {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <Box
      ref={setNodeRef}
      style={{
        width: '100%',
        height: 40,
        border: '1px dashed #444',
        backgroundColor: isOver ? '#333' : 'transparent',
        borderRadius: 4,
      }}
    />
  );
}
