"use client";
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  writeBatch,
  collection,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  SlidersHorizontal,
  UserCheck,
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
import type { Assignment, Judge, Team } from "../../lib/types"; // Ensure path is correct
import { Card } from "../ui/Card"; // Ensure paths are correct
import MotionCard from "../ui/MotionCard";
import { Button } from "../ui/Button";
import { CustomDropdown } from "../ui/CustomDropdown";
import { Input } from "../ui/Input";
import ScoreEntryForm from "../shared/ScoreEntryForm"; // Ensure path is correct
import Tooltip from "../ui/Tooltip";
import JudgeDetailsModal from "../shared/JudgeDetailsModal"; // <--- Import shared modal

// --- Helper function for new logic ---
/**
 * Counts the number of common elements between two arrays.
 * Assumes arrays do not contain duplicates.
 */
const getCommonTeamCount = (arr1: string[], arr2: string[]): number => {
  const set1 = new Set(arr1);
  let count = 0;
  for (const id of arr2) {
    if (set1.has(id)) {
      count++;
    }
  }
  return count;
};

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

  // ---  Memoized list of all active teams on the selected floor ---
  const allTeamsOnFloor = useMemo(() => {
    return teams
      .filter((t) => t.floorId === selectedFloorId && !t.isPaused)
      .sort((a, b) => a.number - b.number);
  }, [teams, selectedFloorId]);
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
    if (!selectedFloorId || !judges || !teams || !assignments) return details; // Add checks for data

    const allSubmitted = assignments.filter((a) => a.submitted);
    const allCurrent = assignments.filter((a) => !a.submitted);

    for (const judge of judges) {
      if (judge.floorId !== selectedFloorId) continue;

      const completedIds = new Set(
        allSubmitted
          .filter((a) => a.judgeId === judge.id)
          .flatMap((a) => a.teamIds),
      );
      const currentAssignment = allCurrent.find((a) => a.judgeId === judge.id);
      const currentIds = currentAssignment ? currentAssignment.teamIds : [];

      const candidateTeams = allTeamsOnFloor.filter(
        (t) => !completedIds.has(t.id),
      );

      const isPossible = candidateTeams.length >= 5;

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
  }, [judges, teams, assignments, selectedFloorId, teamMap, allTeamsOnFloor]); // Added allTeamsOnFloor dependency

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
    // [MODIFIED] Use memoized allTeamsOnFloor
    return allTeamsOnFloor.filter((t) =>
      t.name.toLowerCase().includes(teamSearch.toLowerCase()),
    );
  }, [allTeamsOnFloor, selectedFloorId, teamSearch]);

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
  }, [selectedFloorId, assignableJudges]);

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
      throw error; // Re-throw
    }
  };

  // Handler to remove a single team from an assignment
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

  // --- Fisher-Yates Shuffle Function ---
  const shuffleArray = (array: any[]) => {
    let currentIndex = array.length,
      randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex !== 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [
        array[randomIndex],
        array[currentIndex],
      ];
    }
    return array;
  };

  const generateAssignments = async () => {
    if (!currentEvent || !user) return;
    if (autoSelectedJudgeIds.length === 0)
      return showToast("Please select at least one judge.", "error");
    if (!selectedFloorId) return showToast("Please select a floor.", "error");
    setIsAssigning(true);
    try {
      // This is still needed for checking a judge's *personal* history
      const allSubmittedAssignments = assignments.filter((a) => a.submitted);

      const globallyLockedTeamIds = new Set<string>();

      // --- Shuffle the selected judges list ---
      const selectedJudgesList = shuffleArray(
        autoSelectedJudgeIds
          .map((id) => judges.find((j) => j.id === id))
          .filter((j): j is Judge => !!j),
      );

      // --- Overlap Logic ---
      const availablePool = allTeamsOnFloor.filter(
        (team) => !globallyLockedTeamIds.has(team.id),
      );
      const numJudgesToAssign = selectedJudgesList.length;
      const maxExclusiveBlocks = Math.floor(availablePool.length / 5);
      const isOverlapMode = numJudgesToAssign > maxExclusiveBlocks;

      const ephemeralPressureMap = new Map<string, number>(
        allTeamsOnFloor.map((t) => [t.id, t.reviewedBy.length]),
      );
      const assignedBlockSignatures = new Set<string>();

      // --- [FIX for Subsequent Duplicates] ---
      // Check against ALL existing assignments (submitted or active), not just submitted ones.
      const existingBlockArrays: string[][] = [];
      for (const assignment of assignments) {
        // <--- FIX: Use `assignments`
        if (
          assignment.teamIds.length === 5 &&
          assignment.floorId === selectedFloorId
        ) {
          // Store the sorted array of IDs
          existingBlockArrays.push([...assignment.teamIds].sort());
        }
      }
      // --- [END FIX] ---

      const newAssignmentsToCreate: { judge: Judge; teams: Team[] }[] = [];
      const failedAssignments: { judgeName: string; reason: string }[] = [];

      for (const judge of selectedJudgesList) {
        const alreadyJudgedIds = new Set(
          allSubmittedAssignments // This is correct, only check *submitted* for a judge's personal history
            .filter((a) => a.judgeId === judge.id)
            .flatMap((a) => a.teamIds),
        );

        const teamsJudgeCouldSee = allTeamsOnFloor.filter(
          (team) => !alreadyJudgedIds.has(team.id),
        );
        const candidateTeams = teamsJudgeCouldSee.filter(
          (team) => !globallyLockedTeamIds.has(team.id),
        );

        if (teamsJudgeCouldSee.length < 5) {
          failedAssignments.push({
            judgeName: judge.name,
            reason: "has judged nearly all teams on this floor",
          });
          continue;
        }

        if (candidateTeams.length < 5) {
          failedAssignments.push({
            judgeName: judge.name,
            reason: "not enough free teams, others are locked by this batch",
          });
          continue;
        }

        let bestAssignment: Team[] | null = null;
        let lowestTotalScore = Infinity;

        // --- [MODIFICATION] PASS 1: Strict ---
        // Try to find a block that is not "too similar"
        for (let i = 0; i <= candidateTeams.length - 5; i++) {
          const window = candidateTeams.slice(i, i + 5);
          const windowTeamIds = window.map((t) => t.id).sort();

          let isTooSimilar = false;
          for (const existingBlock of existingBlockArrays) {
            const commonCount = getCommonTeamCount(
              windowTeamIds,
              existingBlock,
            );
            if (commonCount >= 4) {
              isTooSimilar = true;
              break;
            }
          }

          if (isTooSimilar) {
            continue; // Skip this block
          }

          const pressureScore = window.reduce(
            (sum, team) => sum + (ephemeralPressureMap.get(team.id) || 0),
            0,
          );
          const closenessPenalty = window[4].number - window[0].number;
          const totalScore = pressureScore * 1000 + closenessPenalty;

          if (totalScore < lowestTotalScore) {
            lowestTotalScore = totalScore;
            bestAssignment = window;
          }
        }

        // --- [MODIFICATION] PASS 2: Relaxed (if Pass 1 found nothing) ---
        // If no block was found, run again *without* the similarity check.
        // This ensures the judge gets *something*.
        if (bestAssignment === null) {
          lowestTotalScore = Infinity; // Reset score

          for (let i = 0; i <= candidateTeams.length - 5; i++) {
            const window = candidateTeams.slice(i, i + 5);

            // [Hammad's Rule (isTooSimilar) is intentionally skipped]

            const pressureScore = window.reduce(
              (sum, team) => sum + (ephemeralPressureMap.get(team.id) || 0),
              0,
            );
            const closenessPenalty = window[4].number - window[0].number;
            const totalScore = pressureScore * 1000 + closenessPenalty;

            if (totalScore < lowestTotalScore) {
              lowestTotalScore = totalScore;
              bestAssignment = window;
            }
          }
        }
        // --- [END MODIFICATION] ---

        if (bestAssignment) {
          // --- Reversal Logic ---
          const blockSignature = bestAssignment.map((t) => t.id).join("_");
          let finalTeams = bestAssignment;

          if (assignedBlockSignatures.has(blockSignature)) {
            // This is an overlap! Reverse the array.
            finalTeams = [...bestAssignment].reverse();
          } else {
            // First time this block is assigned in this batch.
            assignedBlockSignatures.add(blockSignature);
          }

          newAssignmentsToCreate.push({ judge, teams: finalTeams });

          // --- [CRITICAL FIX] ---
          // Add the newly assigned block to the `existingBlockArrays`
          // so it's blocked for the *next judge in this same batch*.
          existingBlockArrays.push(finalTeams.map((t) => t.id).sort());
          // --- [END CRITICAL FIX] ---

          // --- Update Pressure/Locks ---
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
        } else {
          // This should now be almost impossible
          failedAssignments.push({
            judgeName: judge.name,
            reason: "no suitable group of 5 teams found (all criteria failed)",
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
            teamIds: teams.map((t) => t.id),
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
                      <div className="custom-scrollbar grid h-76 grid-cols-2 space-y-1 overflow-y-auto pr-1">
                        {assignableJudges.length > 0 ? (
                          assignableJudges.map((j) => {
                            const details = judgeDetailsMap.get(j.id);
                            const allTeamsOnFloorCount = allTeamsOnFloor.length;
                            const completedTeams =
                              details?.completedTeams ?? [];
                            const completedCount = completedTeams.length;
                            const tooltipTeams = [...completedTeams].sort(
                              (a, b) => a.number - b.number,
                            );
                            const tooltipContent =
                              tooltipTeams.length > 0
                                ? tooltipTeams
                                    .map((t) => `#${t.number}: ${t.name}`)
                                    .join("\n")
                                : "No teams evaluated yet";
                            const teamNumbersText =
                              tooltipTeams.length > 0
                                ? tooltipTeams
                                    .map((t) => `#${t.number}`)
                                    .join(", ")
                                : "";

                            return (
                              // --- [MODIFIED] ---
                              <label
                                key={j.id}
                                className="flex h-min cursor-pointer items-start space-x-3 rounded-lg p-2 transition-colors hover:bg-zinc-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={autoSelectedJudgeIds.includes(j.id)}
                                  onChange={() => handleToggleJudge(j.id)}
                                  className="mt-1 size-4 flex-shrink-0 cursor-pointer rounded border-zinc-600 bg-zinc-900 text-orange-600 focus:ring-2 focus:ring-orange-500/50"
                                />
                                <div className="relative w-full flex-grow">
                                  <span className="w-full text-sm font-medium">
                                    {j.name}
                                    <span className="absolute right-0 mt-0.5 rounded-md bg-zinc-600 p-0.5 px-2 text-xs font-medium text-zinc-300">
                                      Assigned {j.completedAssignments ?? 0}x
                                    </span>
                                  </span>
                                  {/* --- Stats Display --- */}
                                  <div className="text-xs text-zinc-400">
                                    <span className="font-medium text-zinc-300">
                                      {completedCount} / {allTeamsOnFloorCount}
                                    </span>{" "}
                                    teams evaluated
                                  </div>

                                  {teamNumbersText && (
                                    <Tooltip
                                      content={
                                        <pre className="text-left">
                                          {tooltipContent}
                                        </pre>
                                      }
                                      position="bottom"
                                    >
                                      <p className="mt-1 max-w-full rounded bg-zinc-700/50 px-1.5 py-0.5 text-xs text-zinc-400">
                                        <span className="font-semibold text-zinc-300">
                                          Seen:
                                        </span>{" "}
                                        {teamNumbersText}
                                      </p>
                                    </Tooltip>
                                  )}
                                </div>
                              </label>
                              // --- [END MODIFICATION] ---
                            );
                          })
                        ) : (
                          <p className="col-span-2 flex h-full flex-col items-center justify-center gap-2 pt-4 text-center text-sm text-zinc-500 italic">
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
                                  {team.name} (#{team.number})
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
