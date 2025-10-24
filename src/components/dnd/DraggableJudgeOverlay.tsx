import React from "react";
import { GripVertical, Lock } from "lucide-react";
import type { Judge } from "../../lib/types";

const DraggableJudgeOverlay = React.memo(({ judge }: { judge: Judge }) => {
  const isLocked =
    judge.completedAssignments > 0 || !!judge.currentAssignmentId;

  return (
    <div
      className={`flex w-full touch-none items-center justify-between rounded-md p-2.5 text-sm shadow-lg ${
        isLocked
          ? "cursor-not-allowed bg-zinc-800 ring-2 ring-zinc-600"
          : "bg-zinc-700 ring-2 ring-orange-500"
      }`}
    >
      <div className="flex items-center gap-2">
        {isLocked && <Lock className="size-3.5 text-zinc-500" />}
        <span
          className={`font-semibold ${isLocked ? "text-zinc-500" : "text-zinc-100"}`}
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
