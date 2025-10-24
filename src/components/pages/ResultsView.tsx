"use client";
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Medal,
  Trophy,
  Search,
  Check,
  FileDown,
  List,
  LayoutGrid,
  Minus, // <-- Added Minus icon
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import type { Team, Floor, Judge, Assignment } from "../../lib/types";
import { staggerContainer, fadeInUp } from "../../lib/animations";
import { Card } from "../ui/Card";
import { CustomDropdown } from "../ui/CustomDropdown";
import { Input } from "../ui/Input";
import ScoreDetailModal from "../shared/ScoreDetailModal";
import MotionCard from "../ui/MotionCard";
import { Button } from "../ui/Button";

// --- HELPER TYPES & CONSTANTS ---
type SortKey = "averageScore" | "number" | "highScore" | "lowScore";
type ViewMode = "leaderboard" | "matrix";

const SORT_OPTIONS = [
  { value: "averageScore", label: "Sort by Average Score" },
  { value: "highScore", label: "Sort by High Score" },
  { value: "lowScore", label: "Sort by Low Score" },
  { value: "number", label: "Sort by Team Number" },
];

// --- [UPDATED] Review Matrix Component ---
const ReviewMatrix = ({
  teams,
  judges,
  assignments,
}: {
  teams: Team[];
  judges: Judge[];
  assignments: Assignment[];
}) => {
  // 1. Create a map for quick lookup: Map<teamId, Set<judgeId>>
  const reviewMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const team of teams) {
      map.set(team.id, new Set());
    }

    const submittedAssignments = assignments.filter((a) => a.submitted);
    for (const assignment of submittedAssignments) {
      const judgeId = assignment.judgeId;
      for (const teamId of assignment.teamIds) {
        if (map.has(teamId)) {
          map.get(teamId)!.add(judgeId);
        }
      }
    }
    return map;
  }, [teams, assignments]);

  // 2. Get sorted lists of teams and judges
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.number - b.number),
    [teams],
  );
  const sortedJudges = useMemo(
    () => [...judges].sort((a, b) => a.name.localeCompare(b.name)),
    [judges],
  );

  // 3. Handle CSV Export
  const handleExportCSV = () => {
    const headers = ["Team #", "Team Name", ...sortedJudges.map((j) => j.name)];
    let csvContent = headers.join(",") + "\n";

    for (const team of sortedTeams) {
      const row = [team.number, `"${team.name.replace(/"/g, '""')}"`];
      const reviewedBy = reviewMap.get(team.id) || new Set();
      for (const judge of sortedJudges) {
        row.push(reviewedBy.has(judge.id) ? "1" : "0");
      }
      csvContent += row.join(",") + "\n";
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "review_matrix.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <MotionCard>
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 pb-4">
        <h2 className="text-xl font-bold">Judge Review Matrix</h2>
        <Button
          onClick={handleExportCSV}
          className="bg-gradient-to-br from-orange-500 to-orange-600 transition-all duration-150 hover:from-orange-600 hover:to-orange-700"
        >
          <FileDown className="mr-2 size-4" /> Download Matrix as CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-700">
        <table className="min-w-full divide-y divide-zinc-800 text-center">
          <thead className="bg-zinc-800/90">
            <tr>
              <th className="sticky left-0 z-10 w-16 truncate bg-zinc-800 px-3 py-3 text-center text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Team #
              </th>
              <th className="sticky left-16 z-10 min-w-[200px] bg-zinc-800 px-3 py-3 text-center text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Team Name
              </th>
              {sortedJudges.map((judge) => (
                <th
                  key={judge.id}
                  className="px-3 py-3 text-center text-xs font-semibold tracking-wider text-zinc-400 uppercase"
                >
                  <div
                    className="flex w-full items-center justify-center"
                    title={judge.name}
                  >
                    <span className="w-20 truncate text-center">
                      {judge.name}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900/80">
            {sortedTeams.map((team) => {
              const reviewedBy = reviewMap.get(team.id) || new Set();
              return (
                <tr
                  key={team.id}
                  className="transition-colors hover:bg-zinc-800/60"
                >
                  <td className="sticky left-0 z-10 bg-zinc-900/80 px-3 py-3 text-sm font-medium whitespace-nowrap text-zinc-300">
                    {team.number}
                  </td>
                  <td className="sticky left-16 z-10 bg-zinc-900/80 px-3 py-3 text-sm font-semibold whitespace-nowrap text-white">
                    {team.name}
                  </td>
                  {sortedJudges.map((judge) => (
                    <td
                      key={judge.id}
                      className="px-3 py-3 text-center whitespace-nowrap"
                    >
                      {reviewedBy.has(judge.id) ? (
                        <Check className="mx-auto size-5 text-emerald-400" />
                      ) : (
                        <Minus className="mx-auto size-5 text-zinc-700" />
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </MotionCard>
  );
};

// --- Main Results View ---
const ResultsView = () => {
  const { teams, floors, judges, assignments } = useAppContext();
  const [sortBy, setSortBy] = useState<SortKey>("averageScore");
  const [floorFilter, setFloorFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("leaderboard");

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
      processedTeams = processedTeams.filter(
        (team) =>
          team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          String(team.number).toLowerCase().includes(searchQuery.toLowerCase()),
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
          const scoresA = getScores(a);
          const scoresB = getScores(b);
          // Teams with no scores have a high score of 0
          const highA = scoresA.length ? Math.max(...scoresA) : 0;
          const highB = scoresB.length ? Math.max(...scoresB) : 0;
          primaryDiff = highB - highA;
          break;
        }
        case "lowScore": {
          // --- THIS IS THE FIX ---
          const scoresA = getScores(a);
          const scoresB = getScores(b);
          // Teams with no scores have a low score of Infinity
          const lowA = scoresA.length ? Math.min(...scoresA) : Infinity;
          const lowB = scoresB.length ? Math.min(...scoresB) : Infinity;
          primaryDiff = lowA - lowB; // Sorts in ascending order
          break;
          // --- END FIX ---
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

  // --- [NEW] Better Empty State ---
  if (!teams || teams.length === 0) {
    return (
      <MotionCard>
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <Trophy className="size-16 text-zinc-700" />
          <h3 className="text-2xl font-bold text-orange-400">No Results Yet</h3>
          <p className="max-w-xs text-zinc-400">
            Results will appear here once teams have been created and judging
            has begun.
          </p>
        </div>
      </MotionCard>
    );
  }

  return (
    <div className="space-y-6">
      <MotionCard className="z-20">
        <div className="mb-4 flex flex-col items-center justify-between gap-4 md:flex-row">
          <h1 className="text-3xl font-bold text-white">Final Results</h1>
          {/* --- View Mode Toggle --- */}
          <div className="flex w-full rounded-lg border border-zinc-800 bg-zinc-950/50 p-1 md:w-auto">
            <Button
              onClick={() => setViewMode("leaderboard")}
              className={`w-1/2 md:w-auto ${viewMode === "leaderboard" ? "bg-orange-600" : "bg-transparent"}`}
              size="sm"
            >
              <List className="mr-2 size-4" /> Leaderboard
            </Button>
            <Button
              onClick={() => setViewMode("matrix")}
              className={`w-1/2 md:w-auto ${viewMode === "matrix" ? "bg-orange-600" : "bg-transparent"}`}
              size="sm"
            >
              <LayoutGrid className="mr-2 size-4" /> Review Matrix
            </Button>
          </div>
        </div>

        {/* --- Filters --- */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative md:col-span-3">
            <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-zinc-500" />
            <Input
              type="text"
              placeholder="Search by team name or number..."
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
            disabled={viewMode === "matrix"} // Disable filters for matrix view
          />
          <CustomDropdown
            value={sortBy}
            onChange={(val) => setSortBy(val as SortKey)}
            options={SORT_OPTIONS}
            placeholder="Sort by..."
            disabled={viewMode === "matrix"} // Disable filters for matrix view
          />
        </div>
      </MotionCard>

      {/* --- Conditional View --- */}
      {viewMode === "leaderboard" ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-800 bg-zinc-900/80">
              <thead className="bg-zinc-800/90">
                <tr>
                  <th className="w-20 px-4 py-3 text-center text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                    Team Name
                  </th>
                  <th className="text-zinc-4D0 w-24 px-4 py-3 text-center text-xs font-semibold tracking-wider uppercase">
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
                  const high = scores.length ? Math.max(...scores) : 0;
                  // Use Infinity for low score if no scores exist
                  const low = scores.length ? Math.min(...scores) : Infinity;

                  return (
                    <motion.tr
                      key={team.id}
                      variants={fadeInUp}
                      layout
                      onClick={() => setSelectedTeam(team)}
                      className="cursor-pointer transition-colors hover:bg-zinc-800/60"
                    >
                      <td className="px-4 py-3 text-center text-base font-bold text-white">
                        {typeof rank !== "undefined"
                          ? getRankIcon(rank)
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-left text-sm font-semibold text-white">
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
                        {high.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-medium text-purple-400">
                        {/* Show 'N/A' if low is Infinity, else show the number */}
                        {low === Infinity ? "N/A" : low.toFixed(2)}
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
        </>
      ) : (
        <ReviewMatrix teams={teams} judges={judges} assignments={assignments} />
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
