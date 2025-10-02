import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Medal, Trophy, Search } from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import type { Team, Floor } from "../../lib/types";
import { staggerContainer, fadeInUp } from "../../lib/animations";
import { Card } from "../ui/Card";
import { CustomDropdown } from "../ui/CustomDropdown";
import { Input } from "../ui/Input";
import ScoreDetailModal from "../shared/ScoreDetailModal";

// --- HELPER TYPES & CONSTANTS ---
type SortKey = "averageScore" | "number" | "highScore" | "lowScore";

const SORT_OPTIONS = [
  { value: "averageScore", label: "Sort by Average Score" },
  { value: "highScore", label: "Sort by High Score" },
  { value: "lowScore", label: "Sort by Low Score" },
  { value: "number", label: "Sort by Team Number" },
];

// --- COMPONENT ---
const ResultsView = () => {
  const { teams, floors } = useAppContext();
  const [sortBy, setSortBy] = useState<SortKey>("averageScore");
  const [floorFilter, setFloorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  const floorMap = useMemo(() => {
    return new Map<string, Floor>(floors.map((floor) => [floor.id, floor]));
  }, [floors]);

  const floorOptions = useMemo(() => {
    const options = floors.map((f) => ({ value: f.id, label: f.name }));
    return [{ value: "all", label: "All Floors" }, ...options];
  }, [floors]);

  const rankMap = useMemo(() => {
    const validTeams = Array.isArray(teams) ? teams : [];

    const teamsSortedForRanking = [...validTeams].sort((a, b) => {
      const scoreDiff = (b.averageScore ?? 0) - (a.averageScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (a.number ?? 0) - (b.number ?? 0);
    });

    const map = new Map<string, number>();
    teamsSortedForRanking.forEach((team, index) => {
      map.set(team.id, index);
    });
    return map;
  }, [teams]);

  const filteredAndSortedTeams = useMemo(() => {
    const validTeams = Array.isArray(teams) ? teams : [];
    let processedTeams = validTeams;

    if (searchQuery) {
      processedTeams = processedTeams.filter((team) =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (floorFilter !== "all") {
      processedTeams = processedTeams.filter(
        (team) => team.floorId === floorFilter,
      );
    }

    processedTeams.sort((a, b) => {
      let primaryDiff = 0;
      const getScores = (team: Team): number[] =>
        team.reviewedBy?.map((r) => r.score) || [];

      switch (sortBy) {
        case "averageScore":
          primaryDiff = (b.averageScore ?? 0) - (a.averageScore ?? 0);
          break;
        case "highScore": {
          // Teams with no scores now count as having a high score of 0
          const highA = getScores(a).length ? Math.max(...getScores(a)) : 0;
          const highB = getScores(b).length ? Math.max(...getScores(b)) : 0;
          primaryDiff = highB - highA;
          break;
        }
        case "lowScore": {
          // Teams with no scores now count as having a low score of 0
          const lowA = getScores(a).length ? Math.min(...getScores(a)) : 0;
          const lowB = getScores(b).length ? Math.min(...getScores(b)) : 0;
          primaryDiff = lowB - lowA;
          break;
        }
        case "number":
          primaryDiff = (a.number ?? 0) - (b.number ?? 0);
          break;
        default:
          primaryDiff = 0;
      }

      if (primaryDiff === 0) {
        return (a.number ?? 0) - (b.number ?? 0);
      }

      return primaryDiff;
    });

    return processedTeams;
  }, [teams, searchQuery, floorFilter, sortBy]);

  const getRankIcon = (rank: number) => {
    const rankNum = rank + 1;

    switch (rank) {
      case 0:
        return (
          <Trophy
            className="inline-block size-5 text-yellow-400"
            title="1st Place"
          />
        );
      case 1:
        return (
          <Medal
            className="inline-block size-5 text-gray-300"
            title="2nd Place"
          />
        );
      case 2:
        return (
          <Medal
            className="inline-block size-5 text-amber-600"
            title="3rd Place"
          />
        );
      default:
        return (
          <span className="text-sm font-medium text-zinc-400">{rankNum}</span>
        );
    }
  };

  if (!teams || teams.length === 0) {
    return (
      <Card>
        <p className="text-center text-zinc-400">
          No teams have been added yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Final Results</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search by team name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10"
          />
        </div>
        <CustomDropdown
          value={floorFilter}
          onChange={(val) => setFloorFilter(val as string)}
          options={floorOptions}
          placeholder="Filter by floor..."
        />
        <CustomDropdown
          value={sortBy}
          onChange={(val) => setSortBy(val as SortKey)}
          options={SORT_OPTIONS}
          placeholder="Sort by..."
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-800 bg-zinc-900/80">
          <thead className="bg-zinc-800/90">
            <tr>
              <th className="w-20 px-4 py-3 text-center text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Rank
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Team
              </th>
              <th className="w-24 px-4 py-3 text-center text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Team #
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Floor
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Reviews
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                High
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Low
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Average
              </th>
            </tr>
          </thead>
          <motion.tbody
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            {filteredAndSortedTeams.map((team) => {
              const floor = floorMap.get(team.floorId);
              const rank = rankMap.get(team.id);

              const scores = team.reviewedBy?.map((r) => r.score) || [];
              // Teams with no scores will now display a high/low of 0
              const high = scores.length ? Math.max(...scores) : 0;
              const low = scores.length ? Math.min(...scores) : 0;

              return (
                <motion.tr
                  key={team.id}
                  variants={fadeInUp}
                  layout
                  onClick={() => setSelectedTeam(team)}
                  className="cursor-pointer transition-colors hover:bg-zinc-800/60"
                >
                  <td className="px-4 py-3 text-center text-base font-bold text-white">
                    {typeof rank !== "undefined" ? getRankIcon(rank) : "N/A"}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-semibold text-white">
                    {team.name}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-zinc-300">
                    {team.number}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-zinc-300">
                    {floor?.name || "N/A"}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-zinc-300">
                    {team.reviewedBy?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-blue-400">
                    {typeof high === "number" ? high.toFixed(2) : high}
                  </td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-purple-400">
                    {typeof low === "number" ? low.toFixed(2) : low}
                  </td>
                  <td className="px-4 py-3 text-center text-base font-bold text-teal-400">
                    {(team.averageScore ?? 0).toFixed(2)}
                  </td>
                </motion.tr>
              );
            })}
          </motion.tbody>
        </table>
      </div>

      {filteredAndSortedTeams.length === 0 && (
        <Card>
          <p className="text-center text-zinc-400">
            No teams match the current filters.
          </p>
        </Card>
      )}

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
