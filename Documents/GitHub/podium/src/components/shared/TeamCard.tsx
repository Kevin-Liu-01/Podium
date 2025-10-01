import React from "react";
import { Star, MessageSquare } from "lucide-react";
import type { Team } from "../../lib/types";
import { useAppContext } from "../../context/AppContext";
import MotionCard from "../ui/MotionCard";
import ReviewedJudgeCircle from "./ReviewedJudgeCircle";

const TeamCard = ({ team, onClick }: { team: Team; onClick: () => void }) => {
  const { judges } = useAppContext();

  const TARGET_REVIEWS = 5;
  const reviewCount = team.reviewedBy.length;

  // Progress is capped at 100% when the target is met or exceeded.
  const progress = Math.min((reviewCount / TARGET_REVIEWS) * 100, 100);
  const isGoalMet = reviewCount >= TARGET_REVIEWS;

  // Logic for showing overlapping circles with an overflow indicator.
  const MAX_CIRCLES_SHOWN = 7;
  const reviewsToShow = team.reviewedBy.slice(0, MAX_CIRCLES_SHOWN);
  const overflowCount = team.reviewedBy.length - MAX_CIRCLES_SHOWN;

  return (
    <MotionCard
      onClick={onClick}
      className="group flex h-full cursor-pointer flex-col justify-between gap-4 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10"
    >
      {/* Top Section: Name and Key Stats */}
      <div>
        <h3 className="truncate text-lg font-bold text-white transition-colors group-hover:text-orange-300">
          {team.name}
        </h3>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5" title="Average Score">
            <Star className="size-4 text-amber-400" />
            <span className="font-semibold text-white">
              {team.averageScore.toFixed(2)}
            </span>
          </span>
          <span className="flex items-center gap-1.5" title="Total Reviews">
            <MessageSquare className="size-4 text-sky-400" />
            <span className="font-semibold text-white">{reviewCount}</span>
          </span>
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

      {/* Reviewed By Section with Overflow */}
      <div>
        <h4 className="mb-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Reviewed By
        </h4>
        <div className="flex min-h-[28px] items-center">
          {reviewsToShow.map((review, index) => {
            const judge = judges.find((j) => j.id === review.judgeId);
            return judge ? (
              <div
                key={`${review.judgeId}-${index}`}
                style={{ marginLeft: index > 0 ? "-10px" : "0px" }}
              >
                <ReviewedJudgeCircle judge={judge} review={review} />
              </div>
            ) : null;
          })}

          {overflowCount > 0 && (
            <div
              className="z-10 ml-[-10px] flex size-7 flex-shrink-0 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-600 text-xs font-bold text-white"
              title={`${overflowCount} more reviews`}
            >
              +{overflowCount}
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
