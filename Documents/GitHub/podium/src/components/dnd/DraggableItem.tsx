import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface DraggableItemProps {
  id: string;
  name: string;
}

const DraggableItem = React.memo(({ id, name }: DraggableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    boxShadow: isDragging ? "0 0 15px rgba(249, 115, 22, 0.5)" : "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex touch-none items-center justify-between rounded-md bg-zinc-800 p-2.5 text-sm shadow-md"
    >
      <span className="font-semibold text-zinc-100">{name}</span>
      <button
        {...listeners}
        className="cursor-grab p-1 text-zinc-500 active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
    </div>
  );
});
DraggableItem.displayName = "DraggableItem";

export default DraggableItem;
