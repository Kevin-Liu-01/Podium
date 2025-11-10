"use client";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, updateDoc, writeBatch } from "firebase/firestore";
import { useAppContext } from "../../context/AppContext";
import type { Floor, Judge, Team, Assignment } from "../../lib/types";
// import { getColorForJudge } from "../../lib/utils";
import { staggerContainer, fadeInUp } from "../../lib/animations";
import MotionCard from "../ui/MotionCard";
import TeamCard from "../shared/TeamCard";
import ScoreDetailModal from "../shared/ScoreDetailModal";
import ScoreEntryForm from "../shared/ScoreEntryForm";
import { Button } from "../ui/Button";
import {
  PlusIcon,
  SlidersHorizontal,
  User,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Users2,
  LayoutGrid, // <-- [NEW] Icon
} from "lucide-react";
import { db } from "../../firebase/config";
import Tooltip from "../ui/Tooltip";
import JudgeDetailsModal from "../shared/JudgeDetailsModal";
import { CustomDropdown } from "../ui/CustomDropdown";
import { Input } from "../ui/Input";
import { Card } from "../ui/Card";
import TeamStatusMatrixModal from "../shared/TeamStatusMatrixModal"; // <-- [NEW] Import modal

const TEAM_SORT_OPTIONS = [
  { value: "number", label: "Sort by Team #" },
  { value: "most-seen", label: "Sort by Most Seen" },
  { value: "least-seen", label: "Sort by Least Seen" },
];

const TEAM_FILTER_OPTIONS = [
  { value: "all", label: "Filter: All" },
  { value: "assigned", label: "Filter: Assigned" },
  { value: "unassigned", label: "Filter: Unassigned" },
];

const JUDGE_SORT_OPTIONS = [
  { value: "name", label: "Sort by Name (A-Z)" },
  { value: "most-completed", label: "Sort by Most Completed" },
  { value: "least-completed", label: "Sort by Fewest Completed" },
];

// --- [NEW] Upgraded Judge List Item Component ---
const JudgeListItem = ({
  judge,
  status,
  currentTeams,
  completedTeamsCount,
  totalTeamsOnFloor,
  onViewDetails,
  onEnterScores,
  onViewMatrix,
}: {
  judge: Judge;
  status: "busy" | "assignable" | "finished";
  currentTeams: Team[];
  completedTeamsCount: number;
  totalTeamsOnFloor: number;
  onViewDetails: () => void;
  onEnterScores: () => void;
  onViewMatrix: () => void;
}) => {
  const statusConfig = {
    busy: {
      Icon: Clock,
      label: "Busy",
      className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    assignable: {
      Icon: CheckCircle2,
      label: "Assignable",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    finished: {
      Icon: User,
      label: "Finished",
      className: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    },
  };
  const { Icon, label, className } = statusConfig[status];

  return (
    <motion.div
      layout
      variants={fadeInUp}
      className="flex flex-col gap-3 rounded-lg border border-zinc-700/50 bg-zinc-800/80 p-3"
    >
      {/* Top section: Judge Info */}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="font-bold">{judge.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
            >
              <Icon className="size-3" /> {label}
            </div>
            <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-300">
              Reviewed {completedTeamsCount} / {totalTeamsOnFloor} Teams
            </span>
          </div>
        </div>
        {/* --- [MODIFIED] Added Matrix Button --- */}
        <div className="flex flex-shrink-0 items-center gap-2">
          <Tooltip content="View Judge's Team Matrix" position="left">
            <Button onClick={onViewMatrix} variant="secondary" size="sm">
              <LayoutGrid className="size-4" />
            </Button>
          </Tooltip>
          <Tooltip content="View Judge Details / Move" position="left">
            <Button onClick={onViewDetails} variant="secondary" size="sm">
              <SlidersHorizontal className="size-4" />
            </Button>
          </Tooltip>
        </div>
        {/* --- [END MODIFICATION] --- */}
      </div>

      {/* Middle section: Active Teams (if busy) */}
      {status === "busy" && currentTeams.length > 0 && (
        <div className="border-t border-zinc-700/50 pt-3">
          <p className="mb-1.5 text-xs font-semibold text-zinc-400">
            Actively Assigned:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {currentTeams.map((team) => (
              <Tooltip key={team.id} content={team.name} position="top">
                <span
                  className="max-w-[200px] truncate rounded-full bg-zinc-600 px-2.5 py-0.5 text-xs text-white"
                  title={team.name}
                >
                  #{team.number}
                </span>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {/* Bottom section: Enter Scores Button (if busy) */}
      {status === "busy" && (
        <Tooltip content="Enter scores for this assignment" position="bottom">
          <Button
            onClick={onEnterScores}
            size="sm"
            className="w-full bg-orange-600 hover:bg-orange-500"
          >
            <PlusIcon className="mr-1 size-4" /> Enter Scores
          </Button>
        </Tooltip>
      )}
    </motion.div>
  );
};
// ---

const FloorDashboard = ({ floor }: { floor: Floor }) => {
  const { teams, judges, assignments, currentEvent, user, floors, showToast } =
    useAppContext();

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [assignmentToScore, setAssignmentToScore] = useState<Assignment | null>(
    null,
  );
  const [viewingJudge, setViewingJudge] = useState<Judge | null>(null);
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false); // <-- [NEW] Modal state
  const [matrixJudge, setMatrixJudge] = useState<Judge | null>(null); // <-- [NEW] State for judge-specific matrix

  const [isHandlingSwitchFloor, setIsHandlingSwitchFloor] = useState(false);
  const [isHandlingRemoveAssignment, setIsHandlingRemoveAssignment] =
    useState(false);

  type TeamSort = "number" | "most-seen" | "least-seen";
  type TeamFilter = "all" | "assigned" | "unassigned";
  const [teamSort, setTeamSort] = useState<TeamSort>("number");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("all");
  const [judgeSearch, setJudgeSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "busy" | "assignable" | "finished"
  >("all");
  type JudgeSort = "name" | "most-completed" | "least-completed";
  const [judgeSort, setJudgeSort] = useState<JudgeSort>("name");

  // --- Memoized Data Maps ---
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const assignmentMap = useMemo(
    () => new Map(assignments.map((a) => [a.id, a])),
    [assignments],
  );

  const assignedJudgesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    const activeAssignments = assignments.filter((a) => !a.submitted);
    for (const assignment of activeAssignments) {
      if (assignment.judgeId && Array.isArray(assignment.teamIds)) {
        for (const teamId of assignment.teamIds) {
          const existing = map.get(teamId) ?? [];
          map.set(teamId, [...existing, assignment.judgeId]);
        }
      }
    }
    return map;
  }, [assignments]); // --- Judge Status Logic (Adapted from AssignmentDashboard) ---

  // --- Extracted teamsOnFloor to its own memo ---
  const teamsOnFloor = useMemo(
    () =>
      teams
        .filter((t) => t.floorId === floor.id && !t.isPaused)
        .sort((a, b) => a.number - b.number),
    [teams, floor.id],
  );
  // ---

  const judgeDetailsMap = useMemo(() => {
    const details = new Map<
      string,
      {
        completedTeams: Team[];
        currentTeams: Team[];
        status: "busy" | "assignable" | "finished";
      }
    >();
    if (!floor.id || !judges || !teams || !assignments) return details;

    const allSubmitted = assignments.filter((a) => a.submitted);
    const allCurrent = assignments.filter((a) => !a.submitted);

    for (const judge of judges) {
      if (judge.floorId !== floor.id) continue;

      const completedIds = new Set(
        allSubmitted
          .filter((a) => a.judgeId === judge.id)
          .flatMap((a) => a.teamIds),
      );
      const currentAssignment = allCurrent.find((a) => a.judgeId === judge.id);
      const currentIds = currentAssignment ? currentAssignment.teamIds : [];

      const candidateTeams = teamsOnFloor.filter(
        (t) => !completedIds.has(t.id),
      );
      let isPossible = false;
      if (candidateTeams.length >= 5) {
        // Simplified check, full logic in AssignmentDashboard
        isPossible = true;
      }
      const isFinished = !isPossible && completedIds.size > 0;
      const status = judge.currentAssignmentId
        ? "busy"
        : isFinished
          ? "finished"
          : "assignable";

      details.set(judge.id, {
        status,
        completedTeams: Array.from(completedIds)
          .map((id) => (id ? teamMap.get(id) : undefined))
          .filter((t): t is Team => !!t),
        currentTeams: currentIds
          .map((id) => (id ? teamMap.get(id) : undefined))
          .filter((t): t is Team => !!t),
      });
    }
    return details;
  }, [judges, teams, assignments, floor.id, teamMap, teamsOnFloor]); // Added teamsOnFloor dependency

  const judgesOnFloor = useMemo(
    () => judges.filter((j) => j.floorId === floor.id),
    [judges, floor.id],
  );

  // --- [UPDATED] filteredJudges memo to include sorting ---
  const filteredJudges = useMemo(() => {
    return judgesOnFloor
      .filter((judge) => {
        const nameMatch = judge.name
          .toLowerCase()
          .includes(judgeSearch.toLowerCase());
        const details = judgeDetailsMap.get(judge.id);
        const statusMatch =
          statusFilter === "all" ||
          (details && details.status === statusFilter);
        return nameMatch && statusMatch;
      })
      .sort((a, b) => {
        switch (judgeSort) {
          case "most-completed":
            return (
              (b.completedAssignments ?? 0) - (a.completedAssignments ?? 0)
            );
          case "least-completed":
            return (
              (a.completedAssignments ?? 0) - (b.completedAssignments ?? 0)
            );
          case "name":
          default:
            return a.name.localeCompare(b.name);
        }
      });
  }, [judgesOnFloor, judgeSearch, statusFilter, judgeDetailsMap, judgeSort]);

  // --- Team Lists (Unchanged) ---
  const visibleFloorTeams = useMemo(() => {
    return teams
      .filter((t) => {
        if (t.floorId !== floor.id || t.isPaused) return false;
        if (teamFilter === "assigned") {
          const assigned = assignedJudgesMap.get(t.id);
          return assigned && assigned.length > 0;
        }
        if (teamFilter === "unassigned") {
          const assigned = assignedJudgesMap.get(t.id);
          return !assigned || assigned.length === 0;
        }
        return true;
      })
      .sort((a, b) => {
        switch (teamSort) {
          case "most-seen":
            return (b.reviewedBy?.length ?? 0) - (a.reviewedBy?.length ?? 0);
          case "least-seen":
            return (a.reviewedBy?.length ?? 0) - (b.reviewedBy?.length ?? 0);
          case "number":
          default:
            return a.number - b.number;
        }
      });
  }, [teams, floor.id, teamFilter, teamSort, assignedJudgesMap]);

  const pausedFloorTeams = useMemo(
    () =>
      teams
        .filter((t) => t.floorId === floor.id && t.isPaused)
        .sort((a, b) => a.number - b.number),
    [teams, floor.id],
  ); // ---
  // --- Handlers (Unchanged) ---
  const handleTogglePause = async (teamId: string) => {
    if (!currentEvent || !user) {
      showToast("Cannot update team: missing data.", "error");
      return;
    }
    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      showToast("Team not found.", "error");
      return;
    }
    const teamRef = doc(
      db,
      `users/${user.uid}/events/${currentEvent.id}/teams`,
      teamId,
    );
    try {
      await updateDoc(teamRef, { isPaused: !team.isPaused });
      showToast(
        `${team.name} ${!team.isPaused ? "paused" : "resumed"}.`,
        "success",
      );
    } catch (error) {
      showToast("Failed to update team status.", "error");
    }
  };

  const handleSwitchFloor = async (judgeId: string, newFloorId: string) => {
    const judge = judges.find((j) => j.id === judgeId);
    if (!currentEvent || !user || !judge) {
      showToast("Cannot switch floor: missing data.", "error");
      throw new Error("Missing data for floor switch");
    }
    if (judge.hasSwitchedFloors) {
      showToast("This judge has already switched floors.", "warning");
      throw new Error("Already switched");
    }
    if (!newFloorId) {
      showToast("Please select a destination floor.", "error");
      throw new Error("No destination selected");
    }

    setIsHandlingSwitchFloor(true);
    const judgeRef = doc(
      db,
      `users/${user.uid}/events/${currentEvent.id}/judges`,
      judgeId,
    );
    try {
      await updateDoc(judgeRef, {
        floorId: newFloorId,
        hasSwitchedFloors: true,
      });
      showToast(`${judge.name} moved successfully.`, "success");
    } catch (error) {
      showToast("Failed to switch floor.", "error");
      console.error("Floor switch error:", error);
      throw error;
    } finally {
      setIsHandlingSwitchFloor(false);
    }
  };

  const handleRemoveAssignment = async (
    assignmentId: string,
    judgeId: string,
  ) => {
    if (!currentEvent || !user) {
      showToast("Cannot remove assignment: missing data.", "error");
      throw new Error("Missing data");
    }
    setIsHandlingRemoveAssignment(true);
    try {
      const batch = writeBatch(db);
      const assignmentRef = doc(
        db,
        `users/${user.uid}/events/${currentEvent.id}/assignments`,
        assignmentId,
      );
      const judgeRef = doc(
        db,
        `users/${user.uid}/events/${currentEvent.id}/judges`,
        judgeId,
      );

      batch.delete(assignmentRef);
      batch.update(judgeRef, { currentAssignmentId: null });
      await batch.commit();

      showToast("Assignment successfully removed.", "success");
    } catch (error) {
      console.error("Failed to remove assignment:", error);
      showToast("An error occurred while removing the assignment.", "error");
      throw error;
    } finally {
      setIsHandlingRemoveAssignment(false);
    }
  };

  const handleRemoveTeamFromAssignment = async (
    assignmentId: string,
    teamId: string,
  ) => {
    if (!currentEvent || !user) {
      showToast("Cannot edit assignment: missing data.", "error");
      throw new Error("Missing data");
    }

    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) {
      showToast("Assignment not found.", "error");
      throw new Error("Assignment not found");
    }

    const newTeamIds = assignment.teamIds.filter((id) => id !== teamId);
    const assignmentRef = doc(
      db,
      `users/${user.uid}/events/${currentEvent.id}/assignments`,
      assignmentId,
    );

    try {
      if (newTeamIds.length === 0) {
        await handleRemoveAssignment(assignmentId, assignment.judgeId);
        showToast("Last team removed. Assignment deleted.", "success");
      } else {
        await updateDoc(assignmentRef, { teamIds: newTeamIds });
        showToast("Team removed from assignment.", "success");
      }
    } catch (error) {
      console.error("Error removing team from assignment:", error);
      showToast("Failed to remove team.", "error");
      throw error;
    }
  }; // --- End Handlers ---

  const StatusFilterButton = ({
    value,
    label,
    count,
  }: {
    value: typeof statusFilter;
    label: string;
    count: number;
  }) => (
    <button
      onClick={() => setStatusFilter(value)}
      className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
        statusFilter === value
          ? "bg-orange-600 text-white"
          : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
      }`}
    >
      {label} <span className="text-xs opacity-70">({count})</span>
    </button>
  ); // ---
  // Score Entry Form Rendering
  if (assignmentToScore) {
    return (
      <ScoreEntryForm
        assignment={assignmentToScore}
        onBack={() => setAssignmentToScore(null)}
      />
    );
  } // Robustness Check

  if (!currentEvent || !floor) {
    return (
      <MotionCard className="p-8 text-center text-zinc-400">
        Loading dashboard or data is unavailable...
      </MotionCard>
    );
  }

  return (
    <div>
      <TeamStatusMatrixModal
        isOpen={isMatrixModalOpen}
        onClose={() => setIsMatrixModalOpen(false)}
        teams={teamsOnFloor} // Pass teams for this floor
        assignments={assignments}
        floorName={floor.name}
      />

      {matrixJudge && (
        <TeamStatusMatrixModal
          isOpen={!!matrixJudge}
          onClose={() => setMatrixJudge(null)}
          teams={teamsOnFloor} // Pass teams for this floor
          assignments={assignments.filter((a) => a.judgeId === matrixJudge.id)} // <-- Filter assignments for THIS judge
          floorName={`${matrixJudge.name}'s Matrix - ${floor.name}`}
        />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* --- LEFT COLUMN: JUDGE CONTROL PANEL --- */}
        <div className="lg:col-span-1">
          <MotionCard className="lg:sticky lg:top-28 lg:h-[calc(100vh-8.5rem)]">
            <div className="flex h-full flex-col">
              {" "}
              {/* Added h-full */}
              <h2 className="mb-4 text-xl font-bold">{floor.name} Dashboard</h2>
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Search by judge name..."
                  value={judgeSearch}
                  onChange={(e) => setJudgeSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              {/* --- Sort Dropdown --- */}
              <div className="mb-3">
                <CustomDropdown
                  value={judgeSort}
                  onChange={(val) => setJudgeSort(val as JudgeSort)}
                  options={JUDGE_SORT_OPTIONS}
                  placeholder="Sort Judges"
                />
              </div>
              {/* --- */}
              {/* Filters */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <StatusFilterButton
                  value="all"
                  label="All"
                  count={judgesOnFloor.length}
                />
                <StatusFilterButton
                  value="busy"
                  label="Busy"
                  count={
                    judgesOnFloor.filter(
                      (j) => judgeDetailsMap.get(j.id)?.status === "busy",
                    ).length
                  }
                />
                <StatusFilterButton
                  value="assignable"
                  label="Assignable"
                  count={
                    judgesOnFloor.filter(
                      (j) => judgeDetailsMap.get(j.id)?.status === "assignable",
                    ).length
                  }
                />
                <StatusFilterButton
                  value="finished"
                  label="Finished"
                  count={
                    judgesOnFloor.filter(
                      (j) => judgeDetailsMap.get(j.id)?.status === "finished",
                    ).length
                  }
                />
              </div>
              {/* Judge List */}
              {/* --- MODIFIED: Removed max-h, added flex-1 and min-h-0 --- */}
              <motion.div
                layout
                className="custom-scrollbar -mr-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-2"
              >
                <AnimatePresence>
                  {filteredJudges.length > 0 ? (
                    filteredJudges.map((judge) => {
                      const details = judgeDetailsMap.get(judge.id);
                      if (!details) return null;
                      return (
                        <JudgeListItem
                          key={judge.id}
                          judge={judge}
                          status={details.status}
                          currentTeams={details.currentTeams}
                          // --- MODIFIED ---
                          completedTeamsCount={details.completedTeams.length}
                          totalTeamsOnFloor={teamsOnFloor.length}
                          // --- END MODIFICATION ---
                          onViewDetails={() => setViewingJudge(judge)}
                          onViewMatrix={() => setMatrixJudge(judge)} // <-- [NEW] Pass handler
                          onEnterScores={() => {
                            const assignment = assignmentMap.get(
                              judge.currentAssignmentId!,
                            );
                            if (assignment) setAssignmentToScore(assignment);
                          }}
                        />
                      );
                    })
                  ) : (
                    <Card className="col-span-1 flex h-full flex-col items-center justify-center gap-2 py-8 text-center sm:col-span-2 xl:col-span-3">
                      <XCircle className="inline-block size-6" />
                      <p className="text-zinc-500 italic">
                        No judges match filters.
                      </p>
                    </Card>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </MotionCard>
        </div>
        {/* --- RIGHT COLUMN: TEAM VIEW --- */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Active Teams Section */}
          <MotionCard className="h-full rounded-lg border border-zinc-800 bg-zinc-900/50 shadow-lg shadow-black/30">
            <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Active Teams ({visibleFloorTeams.length})
                </h2>
                <p className="text-sm text-zinc-400">
                  {/* --- MODIFIED --- */}
                  {teamsOnFloor.length} total active teams on this floor.
                  {/* --- END MODIFICATION --- */}
                </p>
              </div>
              {/* --- [NEW] Added Matrix Button --- */}
              <div className="flex flex-col gap-2 p-1 sm:flex-row">
                <Tooltip content="View Team Status Matrix" position="bottom">
                  <Button
                    onClick={() => setIsMatrixModalOpen(true)}
                    variant="secondary"
                    className="flex-shrink-0"
                    disabled={teamsOnFloor.length === 0}
                  >
                    <LayoutGrid className="size-4" />
                  </Button>
                </Tooltip>
                {/* --- [END NEW] --- */}
                <CustomDropdown
                  value={teamFilter}
                  onChange={(val) => setTeamFilter(val as TeamFilter)}
                  options={TEAM_FILTER_OPTIONS}
                  placeholder="Filter Teams"
                />
                <CustomDropdown
                  value={teamSort}
                  onChange={(val) => setTeamSort(val as TeamSort)}
                  options={TEAM_SORT_OPTIONS}
                  placeholder="Sort Teams"
                />
              </div>
            </div>
            <motion.div
              className="grid h-[calc(100%-4rem)] grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {visibleFloorTeams.length > 0 ? (
                visibleFloorTeams.map((team) => {
                  const assignedJudgeIds = assignedJudgesMap.get(team.id) ?? [];
                  return (
                    <motion.div variants={fadeInUp} key={team.id}>
                      <TeamCard
                        team={team}
                        onClick={() => setSelectedTeam(team)}
                        assignedJudgeIds={assignedJudgeIds}
                        onTogglePause={handleTogglePause}
                      />
                    </motion.div>
                  );
                })
              ) : (
                <Card className="col-span-1 flex h-full flex-col items-center justify-center gap-4 text-center sm:col-span-2 xl:col-span-3">
                  <Users2 className="size-16 text-zinc-700" />
                  <p className="font-semibold text-zinc-400">No Teams Added</p>
                  <p className="text-zinc-500 italic">
                    No active teams match the current filters.
                  </p>
                </Card>
              )}
            </motion.div>
          </MotionCard>
          {/* Paused Teams Section */}
          {pausedFloorTeams.length > 0 && (
            <MotionCard className="rounded-lg border border-zinc-800 bg-zinc-900/50 shadow-lg shadow-black/30">
              <h2 className="mb-4 text-xl font-bold text-zinc-400">
                Paused Teams ({pausedFloorTeams.length})
              </h2>
              <motion.div
                className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {pausedFloorTeams.map((team) => {
                  const assignedJudgeIds = assignedJudgesMap.get(team.id) ?? [];
                  return (
                    <motion.div variants={fadeInUp} key={team.id}>
                      <TeamCard
                        team={team}
                        onClick={() => setSelectedTeam(team)}
                        assignedJudgeIds={assignedJudgeIds}
                        onTogglePause={handleTogglePause}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            </MotionCard>
          )}
        </div>
      </div>
      {/* Render Modals */}
      {selectedTeam && (
        <ScoreDetailModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}
      <JudgeDetailsModal
        isOpen={!!viewingJudge}
        judge={viewingJudge}
        assignments={assignments}
        teams={teams}
        floors={floors}
        onClose={() => setViewingJudge(null)}
        onSwitchFloor={handleSwitchFloor}
        onRemoveAssignment={handleRemoveAssignment}
        onRemoveTeamFromAssignment={handleRemoveTeamFromAssignment}
      />
    </div>
  );
};

export default FloorDashboard;
