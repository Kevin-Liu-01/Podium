import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownCircle } from "lucide-react";
import type { Project } from "../../lib/types";
import DraggableProject from "./DraggableProject";

interface DroppableColumnProps {
  id: string;
  title: string;
  projects: Project[];
  isRoom?: boolean;
}

const DroppableColumn = ({
  id,
  title,
  projects,
  isRoom = false,
}: DroppableColumnProps) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  const dropZoneStyle = isOver
    ? "border-2 border-dashed border-orange-500 bg-orange-500/10"
    : "border-2 border-transparent bg-black/20";
  const maxHeight = isRoom ? "max-h-[12rem]" : "h-full";

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 rounded-lg bg-zinc-900/50 p-3 ${maxHeight}`}
    >
      <h3 className="text-center font-bold text-zinc-400">{title}</h3>
      <SortableContext
        id={id}
        items={projects.map((p) => p.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          className={`relative flex-grow space-y-2 overflow-y-auto rounded-md p-2 transition-colors duration-300 ${dropZoneStyle}`}
        >
          <AnimatePresence>
            {isOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-orange-400"
              >
                <ArrowDownCircle className="h-8 w-8" />
                <span className="font-semibold">Drop here</span>
              </motion.div>
            )}
          </AnimatePresence>
          {projects.map((p) => (
            <DraggableProject key={p.id} project={p} />
          ))}
          {projects.length === 0 && !isOver && (
            <div className="flex h-full items-center justify-center">
              <p className="text-xs text-zinc-500 italic">Drag projects here</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export default DroppableColumn;
