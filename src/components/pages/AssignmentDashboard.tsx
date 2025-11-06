// pages/AssignmentDashboard.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  writeBatch,
  collection,
  Timestamp,
  updateDoc,
  deleteDoc, // Import deleteDoc
} from "firebase/firestore";
import {
  SlidersHorizontal,
  UserCheck,
  ChevronsRight,
  History,
  XCircle,
  AlertTriangle,
  Search,
  User,
  Clock,
  CheckCircle2,
  Loader2,
  PlusIcon,
  UserMinus,
} from "lucide-react";
import { db } from "../../firebase/config"; // Ensure path is correct
import { useAppContext } from "../../context/AppContext"; // Ensure path is correct
import type { Assignment, Judge, Team, Floor } from "../../lib/types"; // Ensure path is correct
import { Card } from "../ui/Card"; // Ensure paths are correct
import MotionCard from "../ui/MotionCard";
import { Button } from "../ui/Button";
import { CustomDropdown } from "../ui/CustomDropdown";
import { Input } from "../ui/Input";
import ScoreEntryForm from "../shared/ScoreEntryForm"; // Ensure path is correct
import Tooltip from "../ui/Tooltip";
import JudgeDetailsModal from "../shared/JudgeDetailsModal"; // <--- Import shared modal

// --- Judge List Item Component ---
const JudgeListItem = ({
  judge,
  status,
  onViewDetails,
  onEnterScores,
}: {
  judge: Judge;
  status: "busy" | "assignable" | "finished";
  onViewDetails: () => void;
  onEnterScores: () => void;
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
    <div className="flex items-center gap-3 rounded-lg border border-zinc-700/50 bg-zinc-800/80 p-3">
      <div className="flex-1">
        <p className="font-bold">{judge.name}</p>
        <div
          className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${className}`}
        >
          <Icon className="size-3" />
          {label}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {status === "busy" && (
          <Tooltip content="Enter scores for this assignment" position="left">
            <Button
              onClick={onEnterScores}
              size="sm"
              className="bg-orange-600 hover:bg-orange-500"
            >
              <PlusIcon className="size-4" />
              Enter Scores
            </Button>
          </Tooltip>
        )}
        <Tooltip content="View judge details" position="left">
          <Button onClick={onViewDetails} variant="secondary" size="sm">
            <SlidersHorizontal className="size-4" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---
const AssignmentDashboard = () => {
  const { judges, teams, assignments, floors, currentEvent, showToast, user } =
    useAppContext();

  // Component State
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [assignmentToScore, setAssignmentToScore] = useState<Assignment | null>(
    null,
  );
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [autoSelectedJudgeIds, setAutoSelectedJudgeIds] = useState<string[]>(
    [],
  );
  const [manualSelectedJudgeId, setManualSelectedJudgeId] = useState("");
  const [manualSelectedTeamIds, setManualSelectedTeamIds] = useState<string[]>(
    [],
  );
  const [teamSearch, setTeamSearch] = useState("");
  const [judgeSearch, setJudgeSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "busy" | "assignable" | "finished"
  >("all");
  const [viewingJudge, setViewingJudge] = useState<Judge | null>(null); // State to control modal

  // Memoized data maps for performance
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const assignmentMap = useMemo(
    () => new Map(assignments.map((a) => [a.id, a])),
    [assignments],
  );

  const judgeDetailsMap = useMemo(() => {
    const details = new Map<
      string,
      {
        completedTeams: Team[];
        currentTeams: Team[];
        status: "busy" | "assignable" | "finished";
      }
    >();
    if (!selectedFloorId || !judges || !teams || !assignments) return details; // Add checks for data

    const allSubmitted = assignments.filter((a) => a.submitted);
    const allCurrent = assignments.filter((a) => !a.submitted);
    // [FEATURE 2] Filter out paused teams
    const teamsOnFloor = teams
      .filter((t) => t.floorId === selectedFloorId && !t.isPaused)
      .sort((a, b) => a.number - b.number);

    for (const judge of judges) {
      if (judge.floorId !== selectedFloorId) continue;

      const completedIds = new Set(
        allSubmitted
          .filter((a) => a.judgeId === judge.id)
          .flatMap((a) => a.teamIds),
      );
      const currentAssignment = allCurrent.find((a) => a.judgeId === judge.id);
      const currentIds = currentAssignment ? currentAssignment.teamIds : [];

      // [FEATURE 2] Candidate teams also filters paused
      const candidateTeams = teamsOnFloor.filter(
        (t) => !completedIds.has(t.id),
      );
      let isPossible = false;
      if (candidateTeams.length >= 5) {
        for (let i = 0; i <= candidateTeams.length - 5; i++) {
          const window = candidateTeams.slice(i, i + 5);
          if (window[4].number - window[0].number <= 15) {
            isPossible = true;
            break;
          }
        }
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
  }, [judges, teams, assignments, selectedFloorId, teamMap]);

  const { assignableJudges, judgesOnFloor } = useMemo(() => {
    const onFloor = judges.filter((j) => j.floorId === selectedFloorId);
    return {
      judgesOnFloor: onFloor,
      assignableJudges: onFloor.filter(
        (j) => judgeDetailsMap.get(j.id)?.status === "assignable",
      ),
    };
  }, [judges, selectedFloorId, judgeDetailsMap]);

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
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [judgesOnFloor, judgeSearch, statusFilter, judgeDetailsMap]);

  const manualModeTeams = useMemo(() => {
    if (!selectedFloorId) return [];
    return teams
      .filter(
        (t) =>
          // [FEATURE 2] Filter out paused teams
          t.floorId === selectedFloorId &&
          !t.isPaused &&
          t.name.toLowerCase().includes(teamSearch.toLowerCase()),
      )
      .sort((a, b) => a.number - b.number);
  }, [teams, selectedFloorId, teamSearch]);

  const manualJudgedTeamIds = useMemo(() => {
    if (!manualSelectedJudgeId) return new Set<string>(); // Specify type
    return new Set(
      assignments
        .filter((a) => a.judgeId === manualSelectedJudgeId && a.submitted)
        .flatMap((a) => a.teamIds),
    );
  }, [assignments, manualSelectedJudgeId]);

  // Effects for syncing state
  useEffect(() => {
    if (floors.length > 0) {
      const currentFloorExists = floors.some((f) => f.id === selectedFloorId);
      if (!selectedFloorId || !currentFloorExists) {
        setSelectedFloorId(floors[0].id);
      }
    } else {
      setSelectedFloorId("");
    }
  }, [floors, selectedFloorId]);

  useEffect(() => {
    setAutoSelectedJudgeIds([]);
    setManualSelectedTeamIds([]);
    if (assignableJudges.length > 0) {
      if (
        !manualSelectedJudgeId ||
        !assignableJudges.some((j) => j.id === manualSelectedJudgeId)
      ) {
        setManualSelectedJudgeId(assignableJudges[0].id);
      }
    } else {
      setManualSelectedJudgeId("");
    }
  }, [selectedFloorId, assignableJudges]); // Removed manualSelectedJudgeId

  useEffect(() => {
    setManualSelectedTeamIds([]);
  }, [manualSelectedJudgeId]);

  // --- Handlers ---
  const handleToggleJudge = (judgeId: string) =>
    setAutoSelectedJudgeIds((p) =>
      p.includes(judgeId) ? p.filter((id) => id !== judgeId) : [...p, judgeId],
    );
  const handleToggleTeam = (teamId: string) =>
    setManualSelectedTeamIds((p) =>
      p.includes(teamId) ? p.filter((id) => id !== teamId) : [...p, teamId],
    );
  const toggleSelectAllJudges = () => {
    const allIds = assignableJudges.map((j) => j.id);
    setAutoSelectedJudgeIds(
      autoSelectedJudgeIds.length === allIds.length ? [] : allIds,
    );
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
      throw error; // Re-throw error so modal can handle finally state
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
    // Confirmation handled by modal
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
      throw error; // Re-throw error
    }
  };

  // [FEATURE 3] Handler to remove a single team from an assignment
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
        // If last team is removed, delete the whole assignment
        await handleRemoveAssignment(assignmentId, assignment.judgeId);
        showToast("Last team removed. Assignment deleted.", "success");
      } else {
        // Otherwise, just update the teamIds array
        await updateDoc(assignmentRef, { teamIds: newTeamIds });
        showToast("Team removed from assignment.", "success");
      }
    } catch (error) {
      console.error("Error removing team from assignment:", error);
      showToast("Failed to remove team.", "error");
      throw error; // Re-throw
    }
  };

  const generateAssignments = async () => {
    if (!currentEvent || !user) return;
    if (autoSelectedJudgeIds.length === 0)
      return showToast("Please select at least one judge.", "error");
    if (!selectedFloorId) return showToast("Please select a floor.", "error");
    setIsAssigning(true);
    try {
      // [FEATURE 2] Filter out paused teams
      const allTeamsOnFloor = teams
        .filter((t) => t.floorId === selectedFloorId && !t.isPaused)
        .sort((a, b) => a.number - b.number);
      const allSubmittedAssignments = assignments.filter((a) => a.submitted);
      const activeAssignments = assignments.filter((a) => !a.submitted);

      const globallyLockedTeamIds = new Set(
        activeAssignments.flatMap((a) => a.teamIds),
      );
      const selectedJudgesList = autoSelectedJudgeIds
        .map((id) => judges.find((j) => j.id === id))
        .filter((j): j is Judge => !!j);

      // --- [FEATURE 1] Overlap Logic ---
      const availablePool = allTeamsOnFloor.filter(
        (team) => !globallyLockedTeamIds.has(team.id),
      );
      const numJudgesToAssign = selectedJudgesList.length;
      const maxExclusiveBlocks = Math.floor(availablePool.length / 5);
      const isOverlapMode = numJudgesToAssign > maxExclusiveBlocks;

      // This map tracks pressure *within this batch*
      const ephemeralPressureMap = new Map<string, number>(
        allTeamsOnFloor.map((t) => [t.id, t.reviewedBy.length]),
      );
      // This Set tracks which blocks are assigned *in this batch* for reversal
      const assignedBlockSignatures = new Set<string>();
      // --- End Feature 1 Logic ---

      const newAssignmentsToCreate: { judge: Judge; teams: Team[] }[] = [];
      const failedAssignments: { judgeName: string; reason: string }[] = [];

      for (const judge of selectedJudgesList) {
        const alreadyJudgedIds = new Set(
          allSubmittedAssignments
            .filter((a) => a.judgeId === judge.id)
            .flatMap((a) => a.teamIds),
        );

        // [FEATURE 2] Filter out paused teams
        const candidateTeams = allTeamsOnFloor.filter(
          (team) =>
            !alreadyJudgedIds.has(team.id) &&
            !globallyLockedTeamIds.has(team.id),
        );

        if (candidateTeams.length < 5) {
          const reason =
            allTeamsOnFloor.length - alreadyJudgedIds.size < 5
              ? "has judged nearly all teams"
              : "not enough free teams available";
          failedAssignments.push({ judgeName: judge.name, reason });
          continue;
        }

        let bestAssignment: Team[] | null = null;
        let lowestPressureScore = Infinity;

        // Pass 1: Strict search
        for (let i = 0; i <= candidateTeams.length - 5; i++) {
          const window = candidateTeams.slice(i, i + 5);
          if (window[4].number - window[0].number > 15) continue;

          // [FEATURE 1] Read from ephemeral pressure map
          const pressureScore = window.reduce(
            (sum, team) => sum + (ephemeralPressureMap.get(team.id) || 0),
            0,
          );
          if (pressureScore < lowestPressureScore) {
            lowestPressureScore = pressureScore;
            bestAssignment = window;
          }
        }
        // Pass 2: Relaxed search (if needed)
        if (bestAssignment === null) {
          lowestPressureScore = Infinity;
          for (let i = 0; i <= candidateTeams.length - 5; i++) {
            const window = candidateTeams.slice(i, i + 5);
            // [FEATURE 1] Read from ephemeral pressure map
            const pressureScore = window.reduce(
              (sum, team) => sum + (ephemeralPressureMap.get(team.id) || 0),
              0,
            );
            if (pressureScore < lowestPressureScore) {
              lowestPressureScore = pressureScore;
              bestAssignment = window;
            }
          }
        }

        if (bestAssignment) {
          // --- [FEATURE 1] Reversal Logic ---
          const blockSignature = bestAssignment.map((t) => t.id).join("_");
          let finalTeams = bestAssignment; // Default: 16, 17, 18, 19, 20

          if (assignedBlockSignatures.has(blockSignature)) {
            // This is an overlap! Reverse the array.
            finalTeams = [...bestAssignment].reverse(); // Becomes: 20, 19, 18, 17, 16
          } else {
            // First time this block is assigned in this batch.
            assignedBlockSignatures.add(blockSignature);
          }
          // --- End Feature 1 Reversal ---

          newAssignmentsToCreate.push({ judge, teams: finalTeams });

          // --- [FEATURE 1] Update Pressure/Locks ---
          if (isOverlapMode) {
            // In overlap mode, just update pressure for the next judge
            for (const team of bestAssignment) {
              const currentPressure = ephemeralPressureMap.get(team.id) || 0;
              ephemeralPressureMap.set(team.id, currentPressure + 1);
            }
          } else {
            // In standard (exclusive) mode, lock the teams for this batch
            bestAssignment.forEach((team) =>
              globallyLockedTeamIds.add(team.id),
            );
          }
          // --- End Feature 1 Pressure Update ---
        } else {
          failedAssignments.push({
            judgeName: judge.name,
            reason: "no suitable group found",
          });
        }
      }

      if (newAssignmentsToCreate.length > 0) {
        const batch = writeBatch(db);
        const basePath = `users/${user.uid}/events/${currentEvent.id}`;
        for (const { judge, teams } of newAssignmentsToCreate) {
          const assignmentRef = doc(collection(db, `${basePath}/assignments`));
          batch.set(assignmentRef, {
            judgeId: judge.id,
            teamIds: teams.map((t) => t.id), // `teams` is now correctly ordered
            submitted: false,
            createdAt: Timestamp.now(),
            floorId: selectedFloorId,
          });
          batch.update(doc(db, `${basePath}/judges`, judge.id), {
            currentAssignmentId: assignmentRef.id,
          });
        }
        await batch.commit();
        showToast(
          `${newAssignmentsToCreate.length} assignment(s) created!`,
          "success",
        );
        setAutoSelectedJudgeIds([]);
      }
      if (failedAssignments.length > 0) {
        const failureSummary = failedAssignments
          .map((f) => `${f.judgeName} (${f.reason})`)
          .join("; ");
        showToast(`Could not assign: ${failureSummary}`, "warning", {
          duration: 8000,
        });
      }
      if (
        newAssignmentsToCreate.length === 0 &&
        failedAssignments.length === 0 &&
        autoSelectedJudgeIds.length > 0
      ) {
        showToast(
          "Selected judges could not be assigned (no suitable teams found or teams locked).",
          "info",
        );
      }
    } catch (error) {
      console.error("Failed to generate assignments:", error);
      showToast("An error occurred during assignments.", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  const createManualAssignment = async () => {
    if (!currentEvent || !user) return;
    if (!manualSelectedJudgeId)
      return showToast("Please select a judge.", "error");
    if (manualSelectedTeamIds.length === 0)
      return showToast("Please select at least one team.", "error");
    setIsAssigning(true);
    try {
      const batch = writeBatch(db);
      const basePath = `users/${user.uid}/events/${currentEvent.id}`;
      const assignmentRef = doc(collection(db, `${basePath}/assignments`));
      batch.set(assignmentRef, {
        judgeId: manualSelectedJudgeId,
        teamIds: manualSelectedTeamIds,
        submitted: false,
        createdAt: Timestamp.now(),
        floorId: selectedFloorId,
      });
      batch.update(doc(db, `${basePath}/judges`, manualSelectedJudgeId), {
        currentAssignmentId: assignmentRef.id,
      });
      await batch.commit();
      showToast("Manual assignment created successfully!", "success");
      setManualSelectedTeamIds([]);
      setTeamSearch("");
    } catch (error) {
      console.error("Error creating manual assignment:", error);
      showToast("Error during manual assignment.", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  // --- Render Logic ---
  if (!currentEvent) {
    return (
      <MotionCard>
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="size-12 text-amber-500" />
          <h3 className="text-xl font-bold">No Event Selected</h3>
          <p className="text-zinc-400">
            Please select an event to manage assignments.
          </p>
        </div>
      </MotionCard>
    );
  }

  if (assignmentToScore) {
    return (
      <ScoreEntryForm
        assignment={assignmentToScore}
        onBack={() => setAssignmentToScore(null)}
      />
    );
  }

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
  );

  return (
    <>
      {/* [FEATURE 3] Pass new prop to modal */}
      <JudgeDetailsModal
        isOpen={!!viewingJudge}
        judge={viewingJudge}
        assignments={assignments}
        teams={teams}
        floors={floors}
        onClose={() => setViewingJudge(null)}
        onSwitchFloor={handleSwitchFloor}
        onRemoveAssignment={handleRemoveAssignment}
        onRemoveTeamFromAssignment={handleRemoveTeamFromAssignment} // Pass new handler
      />

      <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
        {/* --- LEFT COLUMN: CONTROLS --- */}
        <div className="flex flex-col gap-4">
          <MotionCard className="z-20">
            {" "}
            {/* Floor Selector */}
            <label className="mb-2 block font-semibold">
              Viewing & Assigning on Floor
            </label>
            <CustomDropdown
              value={selectedFloorId}
              onChange={setSelectedFloorId}
              options={floors.map((f) => ({ value: f.id, label: f.name }))}
              placeholder={
                floors.length > 0 ? "Select a floor..." : "No floors created"
              }
              disabled={floors.length === 0}
            />
          </MotionCard>
          <Card className="z-10 flex h-full flex-col">
            {" "}
            {/* Mode Toggle and Content */}
            <div className="flex border-b border-zinc-700">
              {" "}
              {/* Mode Buttons */}
              <Tooltip
                position="bottom"
                content="Auto-assign based on algorithm."
              >
                <button
                  onClick={() => setMode("auto")}
                  className={`flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${mode === "auto" ? "border-b-2 border-orange-500 text-orange-500" : "text-zinc-400 hover:text-white"}`}
                >
                  <SlidersHorizontal className="size-4" /> Auto Generator
                </button>
              </Tooltip>
              <Tooltip position="bottom" content="Manually assign judges.">
                <button
                  onClick={() => setMode("manual")}
                  className={`flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${mode === "manual" ? "border-b-2 border-orange-500 text-orange-500" : "text-zinc-400 hover:text-white"}`}
                >
                  <UserCheck className="size-4" /> Manual Assignment
                </button>
              </Tooltip>
            </div>
            <AnimatePresence mode="wait">
              {/* Mode Content */}
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-grow pt-4"
              >
                {mode === "auto" && (
                  <div className="flex flex-col">
                    <div className="flex-grow rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <label className="font-semibold text-zinc-300">
                          Assignable Judges ({assignableJudges.length})
                        </label>
                        <Tooltip
                          content={
                            autoSelectedJudgeIds.length ===
                            assignableJudges.length
                              ? "Clear selection"
                              : "Select all assignable judges"
                          }
                        >
                          <button
                            onClick={toggleSelectAllJudges}
                            className="rounded bg-zinc-600 px-2 py-1 text-xs font-semibold hover:bg-zinc-500"
                          >
                            {autoSelectedJudgeIds.length ===
                            assignableJudges.length
                              ? "Deselect All"
                              : "Select All"}
                          </button>
                        </Tooltip>
                      </div>
                      <div className="custom-scrollbar h-76 space-y-1 overflow-y-auto pr-1">
                        {assignableJudges.length > 0 ? (
                          assignableJudges.map((j) => (
                            <label
                              key={j.id}
                              className="flex cursor-pointer items-center space-x-3 rounded p-2 transition-colors hover:bg-zinc-700"
                            >
                              <input
                                type="checkbox"
                                checked={autoSelectedJudgeIds.includes(j.id)}
                                onChange={() => handleToggleJudge(j.id)}
                                className="size-4 cursor-pointer rounded border-zinc-600 bg-zinc-900 text-orange-600 focus:ring-2 focus:ring-orange-500/50"
                              />
                              <span className="text-sm font-medium">
                                {j.name}
                              </span>
                            </label>
                          ))
                        ) : (
                          <p className="flex h-full flex-col items-center justify-center gap-2 pt-4 text-center text-sm text-zinc-500 italic">
                            <UserMinus className="mr-2 size-6" /> No assignable
                            judges.
                          </p>
                        )}
                      </div>
                    </div>
                    <Tooltip content="Automatically finds and assigns the best group of 5 teams to each selected judge.">
                      <div className="mt-4 w-full">
                        <Button
                          onClick={generateAssignments}
                          disabled={
                            !autoSelectedJudgeIds.length ||
                            !selectedFloorId ||
                            isAssigning
                          }
                          className="w-full bg-gradient-to-br from-orange-500 to-orange-600 text-base transition-all duration-150 hover:from-orange-600 hover:to-orange-700"
                        >
                          {isAssigning ? (
                            <Loader2 className="size-5 animate-spin" />
                          ) : (
                            `Generate & Assign (${autoSelectedJudgeIds.length})`
                          )}
                        </Button>
                      </div>
                    </Tooltip>
                  </div>
                )}
                {mode === "manual" && (
                  <div className="flex h-full flex-col gap-4">
                    <div>
                      <label className="mb-2 block font-semibold">
                        Assign Judge
                      </label>
                      <CustomDropdown
                        value={manualSelectedJudgeId}
                        onChange={setManualSelectedJudgeId}
                        options={assignableJudges.map((j) => ({
                          value: j.id,
                          label: j.name,
                        }))}
                        placeholder="Select a judge"
                      />
                    </div>
                    <div className="flex-grow rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                      <div className="mb-3">
                        <label className="mb-2 block font-semibold text-zinc-300">
                          Select Teams ({manualSelectedTeamIds.length} selected)
                        </label>
                        <Input
                          type="text"
                          placeholder="Search teams..."
                          value={teamSearch}
                          onChange={(e) => setTeamSearch(e.target.value)}
                        />
                      </div>
                      <div className="custom-scrollbar h-43.5 space-y-1 overflow-y-auto pr-1">
                        {manualModeTeams.map((team) => {
                          const hasJudged = manualJudgedTeamIds.has(team.id);
                          return (
                            <label
                              key={team.id}
                              className={`flex items-center justify-between rounded p-2 transition-colors ${hasJudged ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-zinc-700"}`}
                            >
                              <div className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  checked={manualSelectedTeamIds.includes(
                                    team.id,
                                  )}
                                  onChange={() => handleToggleTeam(team.id)}
                                  disabled={hasJudged}
                                  className="size-4 cursor-pointer rounded border-zinc-600 bg-zinc-900 text-orange-600 focus:ring-2 focus:ring-orange-500/50 disabled:cursor-not-allowed"
                                />
                                <span className="text-sm font-medium">
                                  {team.name}
                                </span>
                              </div>
                              {hasJudged ? (
                                <Tooltip content="This judge has already submitted a review for this team.">
                                  <span className="text-xs text-zinc-400">
                                    Judged
                                  </span>
                                </Tooltip>
                              ) : (
                                <span className="text-xs text-zinc-400">{`Reviews: ${team.reviewedBy.length}`}</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <Tooltip content="Creates a new assignment with the selected judge and team(s).">
                      <div className="w-full">
                        <Button
                          onClick={createManualAssignment}
                          disabled={
                            !manualSelectedJudgeId ||
                            manualSelectedTeamIds.length === 0 ||
                            isAssigning
                          }
                          className="w-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-base"
                        >
                          {isAssigning ? (
                            <Loader2 className="size-5 animate-spin" />
                          ) : (
                            `Create Manual Assignment`
                          )}
                        </Button>
                      </div>
                    </Tooltip>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </Card>
        </div>

        {/* --- RIGHT COLUMN: JUDGE STATUS --- */}
        <MotionCard className="flex h-full max-h-[calc(100vh-8rem)] flex-col">
          <div className="pb-0">
            {" "}
            {/* Header: Title, Search, Filters */}
            <h2 className="text-xl font-bold">Judge Status Dashboard</h2>
            <div className="mt-4 space-y-3">
              <div className="relative">
                {" "}
                {/* Search */}
                <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-zinc-500" />
                <Input
                  type="text"
                  placeholder="Search by judge name..."
                  value={judgeSearch}
                  onChange={(e) => setJudgeSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {" "}
                {/* Filters */}
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
                  count={assignableJudges.length}
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
            </div>
          </div>
          <div className="custom-scrollbar mt-4 h-full flex-1 space-y-2 overflow-y-auto">
            {" "}
            {/* Judge List */}
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
                      onViewDetails={() => setViewingJudge(judge)} // Open modal here
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
                <MotionCard className="flex h-full flex-col items-center justify-center text-center">
                  {" "}
                  {/* Empty State */}
                  <XCircle className="size-8 text-zinc-600" />
                  <p className="mt-2 font-semibold text-zinc-400">
                    No Judges Found
                  </p>
                  <p className="text-sm text-zinc-500">
                    Try adjusting your search or filter.
                  </p>
                </MotionCard>
              )}
            </AnimatePresence>
          </div>
        </MotionCard>
      </div>
    </>
  );
};

export default AssignmentDashboard;
