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
} from "lucide-react";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { Assignment, Judge, Team, Floor } from "../../lib/types";
import { Card } from "../ui/Card";
import MotionCard from "../ui/MotionCard";
import { Button } from "../ui/Button";
import { CustomDropdown } from "../ui/CustomDropdown";
import { Input } from "../ui/Input";
import ScoreEntryForm from "../shared/ScoreEntryForm";
import Tooltip from "../ui/Tooltip";

// --- [NEW] Judge Details Modal Component ---
const JudgeDetailsModal = ({
  judge,
  details,
  assignment,
  onClose,
  onSwitchFloor,
  onRemoveAssignment,
  floors,
  currentFloorId,
  isSwitchingFloor,
}: {
  judge: Judge;
  details: { completedTeams: Team[]; currentTeams: Team[] };
  assignment: Assignment | undefined;
  onClose: () => void;
  onSwitchFloor: (judgeId: string, newFloorId: string) => void;
  onRemoveAssignment: (assignmentId: string, judgeId: string) => void;
  floors: Floor[];
  currentFloorId: string;
  isSwitchingFloor: boolean;
}) => {
  const [targetFloorId, setTargetFloorId] = useState("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold">{judge.name}</h3>
            <p className="text-sm text-zinc-400">Detailed View</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 transition-colors hover:text-white"
          >
            <XCircle className="size-6" />
          </button>
        </div>

        <div className="mt-6 space-y-6 border-t border-zinc-800 pt-6">
          {/* Current Assignment */}
          {assignment && (
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <ChevronsRight className="size-4 text-amber-400" />
                Currently Evaluating
              </h4>
              <div className="flex flex-wrap gap-2">
                {details.currentTeams.map((t) => (
                  <span
                    key={t.id}
                    className="rounded bg-amber-900/50 px-2 py-1 text-xs font-medium text-amber-300"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
              <div className="mt-4">
                <Tooltip
                  content="Permanently removes this active assignment. This cannot be undone."
                  position="right"
                >
                  <Button
                    onClick={() => onRemoveAssignment(assignment.id, judge.id)}
                    variant="destructive"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <XCircle className="size-4" />
                    Cancel Assignment
                  </Button>
                </Tooltip>
              </div>
            </div>
          )}

          {/* Completed Teams */}
          {details?.completedTeams.length > 0 && (
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <History className="size-4 text-emerald-400" />
                Completed Teams ({details.completedTeams.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {details.completedTeams.map((t) => (
                  <span
                    key={t.id}
                    className="rounded bg-emerald-900/50 px-2 py-1 text-xs font-medium text-emerald-300"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Floor Switching Logic */}
          {!assignment && (
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                <ChevronsRight className="size-4 text-sky-400" />
                Move Judge
              </h4>
              {judge.hasSwitchedFloors ? (
                <Tooltip
                  content="This judge has already moved from their original floor."
                  position="right"
                >
                  <span className="rounded-full bg-zinc-700 px-3 py-1 text-sm font-semibold text-zinc-300">
                    Already Switched Floors
                  </span>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-2">
                  <CustomDropdown
                    value={targetFloorId}
                    onChange={setTargetFloorId}
                    options={floors
                      .filter((f) => f.id !== currentFloorId)
                      .map((f) => ({ value: f.id, label: f.name }))}
                    placeholder="Select destination..."
                  />
                  <Tooltip
                    content="Move this judge to the selected floor. This can only be done once."
                    position="right"
                  >
                    <div>
                      <Button
                        onClick={() => onSwitchFloor(judge.id, targetFloorId)}
                        disabled={!targetFloorId || isSwitchingFloor}
                        size="sm"
                        className="flex w-32 items-center justify-center bg-sky-600 hover:bg-sky-500"
                      >
                        {isSwitchingFloor ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "Switch Floor"
                        )}
                      </Button>
                    </div>
                  </Tooltip>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- [REFACTORED] Judge List Item Component ---
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
  const { judges, teams, assignments, floors, currentEvent, showToast } =
    useAppContext();

  // Component State
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [assignmentToScore, setAssignmentToScore] = useState<Assignment | null>(
    null,
  );
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedFloorId, setSelectedFloorId] = useState("");

  // Auto Mode State
  const [autoSelectedJudgeIds, setAutoSelectedJudgeIds] = useState<string[]>(
    [],
  );

  // Manual Mode State
  const [manualSelectedJudgeId, setManualSelectedJudgeId] = useState("");
  const [manualSelectedTeamIds, setManualSelectedTeamIds] = useState<string[]>(
    [],
  );
  const [teamSearch, setTeamSearch] = useState("");

  // Judge Status UI State
  const [judgeSearch, setJudgeSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "busy" | "assignable" | "finished"
  >("all");
  const [viewingJudge, setViewingJudge] = useState<Judge | null>(null);
  const [isSwitchingFloor, setIsSwitchingFloor] = useState(false); // <-- [FIX] State for loading indicator

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
    if (!selectedFloorId) return details;

    const allSubmitted = assignments.filter((a) => a.submitted);
    const allCurrent = assignments.filter((a) => !a.submitted);
    const teamsOnFloor = teams
      .filter((t) => t.floorId === selectedFloorId)
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
          t.floorId === selectedFloorId &&
          t.name.toLowerCase().includes(teamSearch.toLowerCase()),
      )
      .sort((a, b) => a.number - b.number);
  }, [teams, selectedFloorId, teamSearch]);

  const manualJudgedTeamIds = useMemo(() => {
    if (!manualSelectedJudgeId) return new Set();
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
  }, [selectedFloorId, assignableJudges, manualSelectedJudgeId]);

  useEffect(() => {
    setManualSelectedTeamIds([]);
  }, [manualSelectedJudgeId]);

  // Handler functions
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

  // --- [FIXED] handleSwitchFloor function ---
  const handleSwitchFloor = async (judgeId: string, newFloorId: string) => {
    const judge = judges.find((j) => j.id === judgeId);
    if (!currentEvent || !judge) return;
    if (judge.hasSwitchedFloors)
      return showToast("This judge has already switched floors.", "warning");
    if (!newFloorId)
      return showToast("Please select a destination floor.", "error");

    setIsSwitchingFloor(true);
    const judgeRef = doc(db, `events/${currentEvent.id}/judges`, judgeId);
    try {
      await updateDoc(judgeRef, {
        floorId: newFloorId,
        hasSwitchedFloors: true,
      });
      showToast(`${judge.name} moved successfully.`, "success");
      setViewingJudge(null); // <-- Close modal on success
    } catch (error) {
      showToast("Failed to switch floor.", "error");
    } finally {
      setIsSwitchingFloor(false); // <-- Stop loading indicator
    }
  };

  const handleRemoveAssignment = async (
    assignmentId: string,
    judgeId: string,
  ) => {
    if (!currentEvent) return;
    if (
      !window.confirm(
        "Are you sure you want to remove this active assignment? This cannot be undone.",
      )
    ) {
      return;
    }
    setIsAssigning(true);
    try {
      const batch = writeBatch(db);
      const assignmentRef = doc(
        db,
        `events/${currentEvent.id}/assignments`,
        assignmentId,
      );
      const judgeRef = doc(db, `events/${currentEvent.id}/judges`, judgeId);

      batch.delete(assignmentRef);
      batch.update(judgeRef, { currentAssignmentId: null });

      await batch.commit();
      showToast("Assignment successfully removed.", "success");
      setViewingJudge(null);
    } catch (error) {
      console.error("Failed to remove assignment:", error);
      showToast("An error occurred while removing the assignment.", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  const generateAssignments = async () => {
    if (!currentEvent) return;
    if (autoSelectedJudgeIds.length === 0)
      return showToast("Please select at least one judge.", "error");
    if (!selectedFloorId) return showToast("Please select a floor.", "error");
    setIsAssigning(true);

    try {
      const allTeamsOnFloor = teams
        .filter((t) => t.floorId === selectedFloorId)
        .sort((a, b) => a.number - b.number);
      const allSubmittedAssignments = assignments.filter((a) => a.submitted);
      const activeAssignments = assignments.filter((a) => !a.submitted);

      const globallyLockedTeamIds = new Set(
        activeAssignments.flatMap((a) => a.teamIds),
      );

      const selectedJudgesList = autoSelectedJudgeIds
        .map((id) => judges.find((j) => j.id === id))
        .filter((j): j is Judge => !!j);

      const newAssignmentsToCreate = [];
      const failedAssignments = [];

      for (const judge of selectedJudgesList) {
        const alreadyJudgedIds = new Set(
          allSubmittedAssignments
            .filter((a) => a.judgeId === judge.id)
            .flatMap((a) => a.teamIds),
        );

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

          const pressureScore = window.reduce(
            (sum, team) => sum + team.reviewedBy.length,
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
            const pressureScore = window.reduce(
              (sum, team) => sum + team.reviewedBy.length,
              0,
            );
            if (pressureScore < lowestPressureScore) {
              lowestPressureScore = pressureScore;
              bestAssignment = window;
            }
          }
        }

        if (bestAssignment) {
          newAssignmentsToCreate.push({ judge, teams: bestAssignment });
          bestAssignment.forEach((team) => globallyLockedTeamIds.add(team.id));
        } else {
          failedAssignments.push({
            judgeName: judge.name,
            reason: "no suitable group found",
          });
        }
      }

      if (newAssignmentsToCreate.length > 0) {
        const batch = writeBatch(db);
        for (const { judge, teams } of newAssignmentsToCreate) {
          const assignmentRef = doc(
            collection(db, `events/${currentEvent.id}/assignments`),
          );
          batch.set(assignmentRef, {
            judgeId: judge.id,
            teamIds: teams.map((t) => t.id),
            submitted: false,
            createdAt: Timestamp.now(),
            floorId: selectedFloorId,
          });
          batch.update(doc(db, `events/${currentEvent.id}/judges`, judge.id), {
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
        showToast("Selected judges could not be assigned.", "info");
      }
    } catch (error) {
      console.error("Failed to generate assignments:", error);
      showToast("An error occurred during assignments.", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  const createManualAssignment = async () => {
    if (!currentEvent) return;
    if (!manualSelectedJudgeId)
      return showToast("Please select a judge.", "error");
    if (manualSelectedTeamIds.length === 0)
      return showToast("Please select at least one team.", "error");
    setIsAssigning(true);
    try {
      const batch = writeBatch(db);
      const assignmentRef = doc(
        collection(db, `events/${currentEvent.id}/assignments`),
      );
      batch.set(assignmentRef, {
        judgeId: manualSelectedJudgeId,
        teamIds: manualSelectedTeamIds,
        submitted: false,
        createdAt: Timestamp.now(),
        floorId: selectedFloorId,
      });
      batch.update(
        doc(db, `events/${currentEvent.id}/judges`, manualSelectedJudgeId),
        { currentAssignmentId: assignmentRef.id },
      );
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

  // Render Logic
  if (!currentEvent) {
    return (
      <MotionCard>
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="size-12 text-amber-500" />
          <h3 className="text-xl font-bold">No Event Selected</h3>
          <p className="text-zinc-400">
            Please select an event from the sidebar to manage assignments.
          </p>
        </div>
      </MotionCard>
    );
  }

  if (assignmentToScore)
    return (
      <ScoreEntryForm
        assignment={assignmentToScore}
        onBack={() => setAssignmentToScore(null)}
      />
    );

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
      <AnimatePresence>
        {viewingJudge && (
          <JudgeDetailsModal
            judge={viewingJudge}
            details={judgeDetailsMap.get(viewingJudge.id)!}
            assignment={
              viewingJudge.currentAssignmentId
                ? assignmentMap.get(viewingJudge.currentAssignmentId)
                : undefined
            }
            onClose={() => setViewingJudge(null)}
            onSwitchFloor={handleSwitchFloor}
            onRemoveAssignment={handleRemoveAssignment}
            floors={floors}
            currentFloorId={selectedFloorId}
            isSwitchingFloor={isSwitchingFloor}
          />
        )}
      </AnimatePresence>

      <div className="grid h-full grid-cols-1 gap-8 lg:grid-cols-2">
        {/* --- LEFT COLUMN: CONTROLS --- */}
        <div className="flex flex-col gap-6">
          <MotionCard className="z-20">
            <label className="mb-2 block font-semibold">
              Viewing & Assigning on Floor
            </label>
            <CustomDropdown
              value={selectedFloorId}
              onChange={setSelectedFloorId}
              options={floors.map((f) => ({ value: f.id, label: f.name }))}
              placeholder={
                floors.length > 0
                  ? "Select a floor to manage"
                  : "No floors created"
              }
              disabled={floors.length === 0}
            />
          </MotionCard>
          <Card className="z-10 flex h-full flex-col">
            <div className="flex border-b border-zinc-700">
              <Tooltip content="Automatically assign judges to teams based on algorithm.">
                <button
                  onClick={() => setMode("auto")}
                  className={`flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${mode === "auto" ? "border-b-2 border-orange-500 text-orange-500" : "text-zinc-400 hover:text-white"}`}
                >
                  <SlidersHorizontal className="size-4" /> Auto Generator
                </button>
              </Tooltip>
              <Tooltip content="Manually select a judge and team(s) to create an assignment.">
                <button
                  onClick={() => setMode("manual")}
                  className={`flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${mode === "manual" ? "border-b-2 border-orange-500 text-orange-500" : "text-zinc-400 hover:text-white"}`}
                >
                  <UserCheck className="size-4" /> Manual Assignment
                </button>
              </Tooltip>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-grow pt-4"
              >
                {mode === "auto" && (
                  <div className="flex h-full flex-col">
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
                      <div className="custom-scrollbar max-h-48 space-y-1 overflow-y-auto pr-1">
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
                          <p className="pt-4 text-center text-sm text-zinc-500 italic">
                            No assignable judges on this floor.
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
                      <div className="custom-scrollbar max-h-48 space-y-1 overflow-y-auto pr-1">
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
                                <span className="text-xs text-zinc-400">
                                  {`Reviews: ${team.reviewedBy.length}`}
                                </span>
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

        {/* --- [IMPROVED] RIGHT COLUMN: JUDGE STATUS --- */}
        <MotionCard className="flex h-full max-h-full flex-col">
          <div className="pb-0">
            <h2 className="text-xl font-bold">Judge Status Dashboard</h2>
            <div className="mt-4 space-y-3">
              <div className="relative">
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
            <AnimatePresence>
              {filteredJudges.length > 0 ? (
                filteredJudges.map((judge) => {
                  const details = judgeDetailsMap.get(judge.id);
                  if (!details) return null;
                  return (
                    <motion.div
                      key={judge.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      <JudgeListItem
                        judge={judge}
                        status={details.status}
                        onViewDetails={() => setViewingJudge(judge)}
                        onEnterScores={() => {
                          const assignment = assignmentMap.get(
                            judge.currentAssignmentId!,
                          );
                          if (assignment) setAssignmentToScore(assignment);
                        }}
                      />
                    </motion.div>
                  );
                })
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex h-40 flex-col items-center justify-center text-center"
                >
                  <XCircle className="size-8 text-zinc-600" />
                  <p className="mt-2 font-semibold text-zinc-400">
                    No Judges Found
                  </p>
                  <p className="text-sm text-zinc-500">
                    Try adjusting your search or filter.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </MotionCard>
      </div>
    </>
  );
};

export default AssignmentDashboard;
