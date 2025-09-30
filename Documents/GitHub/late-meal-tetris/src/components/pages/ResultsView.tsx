import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAppContext } from "../../context/AppContext";
import type { Project } from "../../lib/types";
import { staggerContainer, fadeInUp } from "../../lib/animations";
import { Card } from "../ui/Card";
import { CustomDropdown } from "../ui/CustomDropdown";
import ScoreDetailModal from "../shared/ScoreDetailModal";

const ResultsView = () => {
  const { projects, rooms, floors } = useAppContext();
  const [sortBy, setSortBy] = useState<"averageScore" | "name">("averageScore");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      if (sortBy === "averageScore") {
        if (b.averageScore !== a.averageScore) {
          return b.averageScore - a.averageScore;
        }
      }
      return a.name.localeCompare(b.name);
    });
  }, [projects, sortBy]);

  if (projects.length === 0) {
    return (
      <Card>
        <p className="text-center">No projects have been added yet.</p>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Final Results</h1>
      </div>

      <div className="mb-4 max-w-sm">
        <CustomDropdown
          value={sortBy}
          onChange={(val) => setSortBy(val as "averageScore" | "name")}
          options={[
            { value: "averageScore", label: "Sort by Average Score" },
            { value: "name", label: "Sort by Project Name" },
          ]}
          placeholder="Sort by..."
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="min-w-full bg-zinc-900">
          <thead className="bg-zinc-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Rank
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Project Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Room
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Floor
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Reviews
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Average Score
              </th>
            </tr>
          </thead>
          <motion.tbody
            className="text-zinc-300"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {sortedProjects.map((project, index) => {
              const room = rooms.find((r) => r.id === project.roomId);
              const floor = floors.find((f) => f.id === room?.floorId);
              return (
                <motion.tr
                  key={project.id}
                  variants={fadeInUp}
                  onClick={() => setSelectedProject(project)}
                  className="cursor-pointer border-b border-zinc-800 transition-colors hover:bg-zinc-800/50"
                  layout
                >
                  <td className="px-4 py-2 text-sm font-bold">
                    {sortBy === "averageScore" ? index + 1 : "-"}
                  </td>
                  <td className="px-4 py-2 text-sm font-semibold">
                    {project.name}
                  </td>
                  <td className="px-4 py-2 text-sm">{room?.number || "N/A"}</td>
                  <td className="px-4 py-2 text-sm">{floor?.name || "N/A"}</td>
                  <td className="px-4 py-2 text-sm">
                    {project.reviewedBy.length}
                  </td>
                  <td className="px-4 py-2 text-base font-semibold text-orange-500">
                    {project.averageScore.toFixed(2)}
                  </td>
                </motion.tr>
              );
            })}
          </motion.tbody>
        </table>
      </div>

      {selectedProject && (
        <ScoreDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  );
};

export default ResultsView;
