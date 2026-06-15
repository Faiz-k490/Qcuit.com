// In frontend/src/components/DroppableSlot.tsx
import { useDroppable } from '@dnd-kit/core';
import { SLOT_SIZE, SLOT_PADDING } from '../gridConstants';

export function DroppableSlot({
  id,
  x,
  y,
  onSlotClick,
}: {
  id: string;
  x: number;
  y: number;
  onSlotClick: (id: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: id });

  return (
    <rect
      ref={setNodeRef as any}
      onClick={() => onSlotClick(id)}
      x={x + SLOT_PADDING}
      y={y + SLOT_PADDING}
      width={SLOT_SIZE - SLOT_PADDING * 2}
      height={SLOT_SIZE - SLOT_PADDING * 2}
      fill={isOver ? '#333' : 'transparent'}
      stroke="#444"
      strokeDasharray="2 2"
      rx={4}
      style={{ cursor: 'pointer' }}
    />
  );
}
