import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Clock, History, User } from "lucide-react";
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

  // ---  Updated Logic ---
  const isBusy = !!judge.currentAssignmentId;
  const hasHistory = judge.completedAssignments > 0;
  // A judge is only "locked" from dragging if they are busy
  const isDragLocked = isBusy;
  // A judge is only "deletable" if they are not busy AND have no history
  const isDeletable = !isBusy && !hasHistory;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex touch-none items-center justify-between rounded-md bg-zinc-800 px-2.5 py-2 text-sm shadow-md ring-1 ring-zinc-700 ${
        isDragging ? "shadow-lg ring-2 ring-orange-500" : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {/* ---  Status Icon & Tooltip --- */}
        <Tooltip
          content={
            isBusy
              ? "Busy (Active Assignment)"
              : hasHistory
                ? "Movable (has history)"
                : "Movable"
          }
          position="right"
        >
          {isBusy ? (
            <Clock className="size-4 flex-shrink-0 text-amber-400" />
          ) : hasHistory ? (
            <History className="size-4 flex-shrink-0 text-emerald-400" />
          ) : (
            <User className="size-4 flex-shrink-0 text-emerald-400" />
          )}
        </Tooltip>

        {/* --- Name --- */}
        <span
          className={`truncate font-semibold ${
            isBusy ? "text-zinc-500" : "text-zinc-100"
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

        {/* ---  Delete Button --- */}
        {isDeletable && (
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

        {/* ---  Drag Handle --- */}
        <button
          {...listeners}
          disabled={isDragLocked}
          className={`p-1 ${
            isDragLocked
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
