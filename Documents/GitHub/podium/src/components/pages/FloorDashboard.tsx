import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "../../context/AppContext";
import type { Floor, Judge, Project } from "../../lib/types";
import { getColorForJudge } from "../../lib/utils";
import { staggerContainer, fadeInUp } from "../../lib/animations";
import MotionCard from "../ui/MotionCard";
import ProjectCard from "../shared/ProjectCard";
import ScoreDetailModal from "../shared/ScoreDetailModal";

const FloorDashboard = ({ floor }: { floor: Floor }) => {
  const { projects, judges, assignments } = useAppContext();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const floorProjects = useMemo(
    () =>
      projects
        .filter((p) => p.floorId === floor.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [projects, floor.id],
  );

  const { judgesOut, judgesAvailable, judgesFinished } = useMemo(() => {
    const judgesOut = assignments
      .filter((a) => a.floorId === floor.id && !a.submitted)
      .map((a) => judges.find((j) => j.id === a.judgeId))
      .filter((j): j is Judge => !!j);

    const judgesOutIds = new Set(judgesOut.map((j) => j.id));

    const judgesAvailable = judges.filter((j) => !j.currentAssignmentId);

    const assignableFloorProjects = projects.filter(
      (p) => p.floorId === floor.id && p.roomId && p.reviewedBy.length < 5,
    );

    const judgesFinished = judges.filter((judge) => {
      if (judgesOutIds.has(judge.id)) return false;
      const hasEligibleProjects = assignableFloorProjects.some(
        (project) =>
          !project.reviewedBy.some((review) => review.judgeId === judge.id),
      );
      return !hasEligibleProjects;
    });

    return { judgesOut, judgesAvailable, judgesFinished };
  }, [judges, assignments, projects, floor.id]);

  const JudgeList = ({
    title,
    judges,
    color,
  }: {
    title: string;
    judges: Judge[];
    color: string;
  }) => (
    <MotionCard>
      <h2 className={`mb-3 text-lg font-semibold ${color}`}>
        {title} ({judges.length})
      </h2>
      <div className="max-h-40 space-y-2 overflow-y-auto pr-2">
        {judges.length > 0 ? (
          judges.map((judge) => (
            <div
              key={judge.id}
              className="flex items-center gap-3 rounded-md bg-zinc-800 p-2 text-sm"
            >
              <span
                className={`h-2 w-2 flex-shrink-0 rounded-full ${getColorForJudge(judge.id)}`}
              ></span>
              <span className="font-medium">{judge.name}</span>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500 italic">
            No judges in this category.
          </p>
        )}
      </div>
    </MotionCard>
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{floor.name} Dashboard</h1>
        <p className="text-lg text-zinc-400">{floorProjects.length} Projects</p>
      </div>

      <motion.div
        className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <JudgeList
          title="Judges Out"
          judges={judgesOut}
          color="text-amber-400"
        />
        <JudgeList
          title="Available Judges"
          judges={judgesAvailable}
          color="text-emerald-400"
        />
        <JudgeList
          title="Finished on Floor"
          judges={judgesFinished}
          color="text-sky-400"
        />
      </motion.div>

      <p className="mb-4 text-zinc-400">
        Click on a project to see detailed scores and edit if necessary.
      </p>

      <motion.div
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {floorProjects.map((project) => (
          <motion.div variants={fadeInUp} key={project.id}>
            <ProjectCard
              project={project}
              onClick={() => setSelectedProject(project)}
            />
          </motion.div>
        ))}
      </motion.div>

      {selectedProject && (
        <ScoreDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
};

export default FloorDashboard;
