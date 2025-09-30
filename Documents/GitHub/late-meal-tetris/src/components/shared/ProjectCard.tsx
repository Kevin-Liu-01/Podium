import React from "react";
import type { Project } from "../../lib/types";
import { useAppContext } from "../../context/AppContext";
import { Card } from "../ui/Card";
import ReviewedJudgeCircle from "./ReviewedJudgeCircle";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

const ProjectCard = ({ project, onClick }: ProjectCardProps) => {
  const { rooms, judges } = useAppContext();
  const room = rooms.find((r) => r.id === project.roomId);
  const reviewCount = project.reviewedBy.length;
  const maxReviews = 5;
  const reviewStatusColor =
    reviewCount >= maxReviews ? "border-emerald-500" : "border-zinc-700";
  const reviewStatusBg =
    reviewCount >= maxReviews ? "bg-emerald-900/50" : "bg-zinc-800";

  return (
    <Card
      onClick={onClick}
      className={`flex h-full cursor-pointer flex-col justify-between border-2 transition-all duration-300 hover:border-orange-500/50 hover:shadow-2xl ${reviewStatusBg} ${reviewStatusColor}`}
    >
      <div>
        <h3 className="truncate text-base font-bold">{project.name}</h3>
        <p className="text-xs text-zinc-400">Room {room?.number || "N/A"}</p>
      </div>
      <div className="mt-3">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-zinc-300">Reviews:</span>
          <span className="font-bold">
            {reviewCount} / {maxReviews}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-700">
          <div
            className="h-2 rounded-full bg-orange-500"
            style={{ width: `${(reviewCount / maxReviews) * 100}%` }}
          ></div>
        </div>
      </div>
      <div className="mt-3">
        <h4 className="mb-1.5 text-xs font-semibold text-zinc-400 uppercase">
          Reviewed By
        </h4>
        <div className="flex min-h-[28px] flex-wrap gap-1.5">
          {project.reviewedBy.map((review) => {
            const judge = judges.find((j) => j.id === review.judgeId);
            return judge ? (
              <ReviewedJudgeCircle
                key={review.judgeId}
                judge={judge}
                review={review}
              />
            ) : null;
          })}
        </div>
      </div>
    </Card>
  );
};

export default ProjectCard;
