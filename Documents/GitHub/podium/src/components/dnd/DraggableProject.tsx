import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Project } from "../../lib/types";

const DraggableProject = React.memo(({ project }: { project: Project }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: project.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex touch-none items-center justify-between rounded-md bg-zinc-800 p-2 text-sm shadow"
    >
      <span className="font-semibold">{project.name}</span>
      <button
        {...listeners}
        className="cursor-grab text-zinc-500 active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>
    </div>
  );
});
DraggableProject.displayName = "DraggableProject";

export default DraggableProject;
