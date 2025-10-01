import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Medal, Trophy } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import type { Team, Floor } from "../../lib/types";
import { staggerContainer, fadeInUp } from "../../lib/animations";
import { Card } from "../ui/Card";
import { CustomDropdown } from "../ui/CustomDropdown";
import ScoreDetailModal from "../shared/ScoreDetailModal";

const ResultsView = () => {
  const { teams, floors } = useAppContext();
  const [sortBy, setSortBy] = useState<"averageScore" | "number">(
    "averageScore",
  );
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // 1. Create a fast lookup map for floors to improve performance.
  const floorMap = useMemo(() => {
    return new Map<string, Floor>(floors.map((floor) => [floor.id, floor]));
  }, [floors]);

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      // Primary sort: by average score if selected
      if (sortBy === "averageScore" && b.averageScore !== a.averageScore) {
        return b.averageScore - a.averageScore;
      }
      // Fallback sort: by team number
      return a.number - b.number;
    });
  }, [teams, sortBy]);

  // Helper to get styling for top ranks
  const getRankClass = (rank: number) => {
    if (sortBy !== "averageScore") return "";
    switch (rank) {
      case 0: // 1st Place
        return "bg-amber-500/10 hover:bg-amber-500/20";
      case 1: // 2nd Place
        return "bg-slate-400/10 hover:bg-slate-400/20";
      case 2: // 3rd Place
        return "bg-orange-700/10 hover:bg-orange-700/20";
      default:
        return "hover:bg-zinc-800/50";
    }
  };

  const getRankIcon = (rank: number) => {
    if (sortBy !== "averageScore") return <span>-</span>;
    const rankNum = rank + 1;

    if (rank === 0)
      return (
        <Trophy
          className="inline-block size-5 text-amber-400"
          title="1st Place"
        />
      );
    if (rank === 1)
      return (
        <Medal
          className="inline-block size-5 text-slate-300"
          title="2nd Place"
        />
      );
    if (rank === 2)
      return (
        <Medal
          className="inline-block size-5 text-orange-500"
          title="3rd Place"
        />
      );

    return <span>{rankNum}</span>;
  };

  if (teams.length === 0) {
    return (
      <Card>
        <p className="text-center">No teams have been added yet.</p>
      </Card>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Final Results</h1>
      <div className="mb-4 max-w-sm">
        <CustomDropdown
          value={sortBy}
          onChange={(val) => setSortBy(val as "averageScore" | "number")}
          options={[
            { value: "averageScore", label: "Sort by Average Score" },
            { value: "number", label: "Sort by Team Number" },
          ]}
          placeholder="Sort by..."
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="min-w-full bg-zinc-900/80">
          <thead className="bg-zinc-800/90 backdrop-blur-sm">
            <tr>
              <th className="w-20 px-4 py-2 text-left text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Rank
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Team
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
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {sortedTeams.map((team, index) => {
              const floor = floorMap.get(team.floorId);
              return (
                <motion.tr
                  key={team.id}
                  variants={fadeInUp}
                  onClick={() => setSelectedTeam(team)}
                  className={`cursor-pointer border-b border-zinc-800 transition-colors ${getRankClass(index)}`}
                  layout
                >
                  <td className="px-4 py-3 text-center text-sm font-bold text-white">
                    {getRankIcon(index)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-orange-400">
                    {team.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">
                    {floor?.name || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">
                    {team.reviewedBy.length}
                  </td>
                  <td className="px-4 py-3 text-base font-semibold text-emerald-400">
                    {team.averageScore.toFixed(2)}
                  </td>
                </motion.tr>
              );
            })}
          </motion.tbody>
        </table>
      </div>
      {selectedTeam && (
        <ScoreDetailModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
    </div>
  );
};

export default ResultsView;
