import React from "react";
import type { Judge, Review } from "../../lib/types";
import { getColorForJudge } from "../../lib/utils";

interface ReviewedJudgeCircleProps {
  judge: Judge;
  review: Review;
}

const ReviewedJudgeCircle = ({ judge, review }: ReviewedJudgeCircleProps) => {
  const initial = judge.name.charAt(0).toUpperCase();
  const judgeColor = getColorForJudge(judge.id);
  const rankBorders: { [key: number]: string } = {
    1: "border-amber-400",
    2: "border-slate-300",
    3: "border-yellow-600",
    0: "border-zinc-500",
  };
  const rankText: { [key: number]: string } = {
    1: "1st Place",
    2: "2nd Place",
    3: "3rd Place",
    0: "Unranked",
  };
  const tooltipText = `${judge.name} - ${rankText[review.rank]} (${review.score} pts)`;

  return (
    <div
      title={tooltipText}
      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold text-white shadow-lg transition-transform hover:scale-110 ${judgeColor} ${rankBorders[review.rank]}`}
    >
      {initial}
    </div>
  );
};

export default ReviewedJudgeCircle;
