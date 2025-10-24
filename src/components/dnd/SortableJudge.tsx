import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Lock, Trash2, Clock, History, User } from "lucide-react";
import type { Judge } from "../../lib/types";
import Tooltip from "../ui/Tooltip";

interface SortableJudgeProps {
  judge: Judge;
  onDelete: (id: string, name: string) => void;
}

const SortableJudge = React.memo(({ judge, onDelete }: SortableJudgeProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: judge.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isBusy = !!judge.currentAssignmentId;
  const hasHistory = judge.completedAssignments > 0;
  const isLocked = isBusy || hasHistory;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex touch-none items-center justify-between rounded-md px-2.5 py-2 text-sm shadow-md ${
        isLocked
          ? "cursor-not-allowed bg-zinc-800 ring-1 ring-zinc-700"
          : "bg-zinc-800 ring-1 ring-zinc-700"
      } ${isDragging ? "shadow-lg ring-2 ring-orange-500" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {/* --- Status Icon --- */}
        <Tooltip
          content={
            isBusy
              ? "This judge is currently busy with an assignment."
              : hasHistory
                ? "This judge has completed assignments and is locked."
                : "This judge is free."
          }
          position="right"
        >
          {isBusy ? (
            <Clock className="size-4 flex-shrink-0 text-amber-400" />
          ) : hasHistory ? (
            <Lock className="size-4 flex-shrink-0 text-zinc-500" />
          ) : (
            <User className="size-4 flex-shrink-0 text-zinc-500" />
          )}
        </Tooltip>

        {/* --- Name --- */}
        <span
          className={`truncate font-semibold ${
            isLocked ? "text-zinc-500" : "text-zinc-100"
          }`}
          title={judge.name}
        >
          {judge.name}
        </span>
      </div>

      {/* --- Stats & Actions --- */}
      <div className="flex flex-shrink-0 items-center gap-1 pl-2">
        {/* --- Completed Count --- */}
        {hasHistory && (
          <Tooltip content="Completed Assignments" position="left">
            <div className="flex items-center gap-1 text-xs text-emerald-400">
              <History className="size-3" />
              {judge.completedAssignments}
            </div>
          </Tooltip>
        )}

        {/* --- Delete Button --- */}
        {!isLocked && (
          <Tooltip content="Delete Judge" position="left">
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent drag from starting
                onDelete(judge.id, judge.name);
              }}
              className="cursor-pointer p-1 text-rose-500/60 transition-colors hover:text-rose-500"
            >
              <Trash2 className="size-4" />
            </button>
          </Tooltip>
        )}

        {/* --- Drag Handle --- */}
        <button
          {...listeners}
          disabled={isLocked}
          className={`p-1 ${
            isLocked
              ? "cursor-not-allowed text-zinc-600"
              : "cursor-grab text-zinc-500 active:cursor-grabbing"
          }`}
        >
          <GripVertical className="size-4" />
        </button>
      </div>
    </div>
  );
});
SortableJudge.displayName = "SortableJudge";

export default SortableJudge;
