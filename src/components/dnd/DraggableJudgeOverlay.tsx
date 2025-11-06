import React from "react";
import { GripVertical, Lock, History } from "lucide-react";
import type { Judge } from "../../lib/types";

const DraggableJudgeOverlay = React.memo(({ judge }: { judge: Judge }) => {
  // A judge is only "locked" from dragging if they have an ACTIVE assignment.
  // Having completed assignments no longer counts as a "lock" for dragging.
  const isLocked = !!judge.currentAssignmentId;
  const hasHistory = judge.completedAssignments > 0;

  return (
    <div
      className={`flex w-full touch-none items-center justify-between rounded-md p-2.5 text-sm shadow-lg ${
        isLocked
          ? "cursor-not-allowed bg-zinc-800 ring-2 ring-zinc-600" // Locked style
          : "bg-zinc-700 ring-2 ring-orange-500" // Draggable style
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Show Lock icon only if actively busy */}
        {isLocked && <Lock className="size-3.5 text-zinc-500" />}

        {/* Show History icon if draggable but has completed assignments */}
        {!isLocked && hasHistory && (
          <History className="size-3.5 text-emerald-500" />
        )}

        <span
          className={`font-semibold ${
            isLocked ? "text-zinc-500" : "text-zinc-100"
          }`}
        >
          {judge.name}
        </span>
      </div>
      <GripVertical className="size-4 cursor-grabbing text-zinc-500" />
    </div>
  );
});
DraggableJudgeOverlay.displayName = "DraggableJudgeOverlay";

export default DraggableJudgeOverlay;
