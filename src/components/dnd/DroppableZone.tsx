import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDownCircle, PlusCircle } from "lucide-react";
import SortableJudge from "./SortableJudge";
import { Card } from "../ui/Card";
import type { Judge } from "../../lib/types";

interface DroppableZoneProps {
  id: string;
  title: string;
  items: Judge[];
  onDeleteJudge: (id: string, name: string) => void;
}

const DroppableZone = ({
  id,
  title,
  items,
  onDeleteJudge,
}: DroppableZoneProps) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  const dropZoneStyle = isOver
    ? "border-2 border-dashed border-orange-500 bg-orange-900/20"
    : "border-2 border-white/5 bg-black/30";

  return (
    <Card className="flex h-full min-h-[200px] flex-col gap-3">
      <h3 className="text-center font-bold text-zinc-300">{title}</h3>
      <SortableContext
        id={id}
        items={items}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className={`custom-scrollbar relative h-full min-h-[4rem] space-y-2 overflow-y-auto rounded-md p-2 transition-colors duration-300 ${dropZoneStyle}`}
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
                <span className="font-semibold">Assign Judge Here</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items?.map((judge) => (
              <SortableJudge
                key={judge.id}
                judge={judge}
                onDelete={onDeleteJudge}
              />
            ))}
          </div>
          {items?.length === 0 && !isOver && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
              <PlusCircle className="size-6 text-zinc-600" />
              <p className="text-xs text-zinc-500 italic">Drag judges here</p>
            </div>
          )}
        </div>
      </SortableContext>
    </Card>
  );
};

export default DroppableZone;
