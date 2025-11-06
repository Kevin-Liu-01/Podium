// shared/TeamCard.tsx
import React, { useMemo } from "react";
import { Star, MessageSquare, Users, Pause, Play } from "lucide-react"; // [FEATURE 2] Add Pause/Play
import type { Team, Judge } from "../../lib/types";
import { useAppContext } from "../../context/AppContext";
import MotionCard from "../ui/MotionCard";
import ReviewedJudgeCircle from "./ReviewedJudgeCircle";
import Tooltip from "../ui/Tooltip"; // Import the new Tooltip component

interface TeamCardProps {
  team: Team;
  onClick: () => void;
  assignedJudgeIds: string[];
  onTogglePause: (teamId: string) => void; // [FEATURE 2] Add handler prop
}

const TeamCard = ({
  team,
  onClick,
  assignedJudgeIds,
  onTogglePause, // [FEATURE 2] Get handler
}: TeamCardProps) => {
  const { judges } = useAppContext();

  const TARGET_REVIEWS = 5;
  const reviewCount = team.reviewedBy.length;
  const progress = Math.min((reviewCount / TARGET_REVIEWS) * 100, 100);
  const isGoalMet = reviewCount >= TARGET_REVIEWS;

  const MAX_CIRCLES_SHOWN = 7;
  const reviewsToShow = team.reviewedBy.slice(0, MAX_CIRCLES_SHOWN);
  const overflowCount = team.reviewedBy.length - MAX_CIRCLES_SHOWN;

  const assignedJudges = useMemo(
    () =>
      assignedJudgeIds
        .map((id) => judges.find((j) => j.id === id))
        .filter((j): j is Judge => !!j),
    [assignedJudgeIds, judges],
  );

  const assignedTooltipContent =
    assignedJudges.length > 0
      ? `Assigned to: ${assignedJudges.map((j) => j.name).join(", ")}`
      : "";

  // [FEATURE 2] Handle pause button click
  const handlePauseClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card's onClick from firing
    onTogglePause(team.id);
  };

  return (
    <MotionCard
      onClick={onClick}
      className={`group/card relative flex h-full cursor-pointer flex-col justify-between gap-4 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10 ${
        team.isPaused ? "opacity-40 grayscale" : "" // [FEATURE 2] Style if paused
      }`}
    >
      {/* [FEATURE 2] Pause/Play Button */}
      <div className="absolute right-3 bottom-3 z-10">
        <Tooltip content={team.isPaused ? "Resume Team" : "Pause Team"}>
          <button
            onClick={handlePauseClick}
            className={`flex size-7 items-center justify-center rounded-full border-2 border-zinc-900 transition-colors ${
              team.isPaused
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "bg-zinc-600 text-zinc-300 hover:bg-zinc-500"
            }`}
          >
            {team.isPaused ? (
              <Play className="size-4 fill-white" />
            ) : (
              <Pause className="size-4" />
            )}
          </button>
        </Tooltip>
      </div>
      {/* --- */}

      {/* Assigned indicator now uses the Tooltip component */}
      {assignedJudges.length > 0 && (
        <div className="absolute top-3 right-3 z-10">
          <Tooltip content={assignedTooltipContent}>
            <div className="flex items-center gap-1.5 rounded-full bg-amber-900/80 px-2 py-1 text-xs font-semibold text-amber-300 shadow-md backdrop-blur-sm">
              <Users className="size-3" />
              <span>{assignedJudges.length}</span>
            </div>
          </Tooltip>
        </div>
      )}

      {/* Top Section: Name and Key Stats */}
      <div>
        <h3 className="truncate pr-12 text-lg font-bold text-white transition-colors group-hover/card:text-orange-300">
          {team.name}
        </h3>
        <div className="mt-2 flex items-center justify-between text-sm">
          <Tooltip content="Average Score">
            <span className="flex items-center gap-1.5">
              <Star className="size-4 text-amber-400" />
              <span className="font-semibold text-white">
                {team.averageScore.toFixed(2)}
              </span>
            </span>
          </Tooltip>
          <Tooltip content="Team Number">
            <span className="flex items-center gap-1.5">
              <Users className="size-4 text-red-400" />
              <span className="font-semibold text-white">
                Team {team.number}
              </span>
            </span>
          </Tooltip>

          <Tooltip content="Total Reviews">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="size-4 text-sky-400" />
              <span className="font-semibold text-white">{reviewCount}</span>
            </span>
          </Tooltip>
        </div>
      </div>

      {/* Progress Bar Section */}
      <div>
        <div className="h-1.5 w-full rounded-full bg-zinc-700/50">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${isGoalMet ? "bg-emerald-500" : "bg-orange-500"}`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Reviewed By Section */}
      <div>
        <h4 className="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Reviewed By
        </h4>
        <div className="flex min-h-[28px] items-center">
          {reviewsToShow.map((review, index) => {
            const judge = judges.find((j) => j.id === review.judgeId);
            if (!judge) return null;
            return (
              <div
                key={`${review.judgeId}-${index}`}
                style={{ marginLeft: index > 0 ? "-10px" : "0px" }}
              >
                <ReviewedJudgeCircle judge={judge} review={review} />
              </div>
            );
          })}
          {/* Overflow counter now uses the Tooltip component */}
          {overflowCount > 0 && (
            <div className="z-10 ml-[-10px]">
              <Tooltip content={`${overflowCount} more reviews`}>
                <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-600 text-xs font-bold text-white">
                  +{overflowCount}
                </div>
              </Tooltip>
            </div>
          )}
          {reviewCount === 0 && (
            <p className="text-xs text-zinc-500 italic">No reviews yet</p>
          )}
        </div>
      </div>
    </MotionCard>
  );
};

export default TeamCard;
