"use client";
import React, { useState, useMemo, useEffect } from "react";
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
  ChevronDown,
  ChevronsRight,
  History,
  XCircle,
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

// --- Co-located Judge Status Card Component ---
const JudgeStatusCard = ({
  judge,
  details,
  assignment,
  onToggle,
  isExpanded,
  onSwitchFloor,
  onEnterScores,
  onRemoveAssignment,
  floors,
  currentFloorId,
}: {
  judge: Judge;
  details: {
    completedTeams: Team[];
    currentTeams: Team[];
    isFinished: boolean;
  };
  assignment: Assignment | undefined;
  onToggle: () => void;
  isExpanded: boolean;
  onSwitchFloor: (judgeId: string, newFloorId: string) => void;
  onEnterScores: (assignment: Assignment) => void;
  onRemoveAssignment: (assignmentId: string, judgeId: string) => void;
  floors: Floor[];
  currentFloorId: string;
}) => {
  const [targetFloorId, setTargetFloorId] = useState("");

  const statusMap = {
    busy: {
      color: "text-amber-400",
      label: `Assigned ${details.currentTeams.length} teams`,
    },
    assignable: { color: "text-emerald-400", label: "Ready to judge" },
    finished: {
      color: "text-sky-400",
      label: "No assignments left on this floor",
    },
  };
  const status = judge.currentAssignmentId
    ? "busy"
    : details.isFinished
      ? "finished"
      : "assignable";

  return (
    <div className="rounded-lg bg-zinc-800/80 p-3 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <p className="font-bold">{judge.name}</p>
          <p className={`text-sm ${statusMap[status].color}`}>
            {statusMap[status].label}
          </p>
        </div>
        {status === "busy" && assignment && (
          <Button
            onClick={() => onEnterScores(assignment)}
            size="md"
            className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-500"
          >
            Enter Scores
          </Button>
        )}
        <button
          onClick={onToggle}
          className="flex-shrink-0 p-1 text-zinc-400 hover:text-white"
        >
          <ChevronDown
            className={`size-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 border-t border-zinc-700 pt-3">
              {status === "busy" && assignment && (
                <>
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-400">
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
                    <Button
                      onClick={() =>
                        onRemoveAssignment(assignment.id, judge.id)
                      }
                      variant="destructive"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <XCircle className="size-4" />
                      Cancel Assignment
                    </Button>
                  </div>
                </>
              )}
              {details.completedTeams.length > 0 && (
                <>
                  <h4 className="mt-3 mb-2 flex items-center gap-2 text-xs font-semibold text-zinc-400">
                    <History className="size-4 text-emerald-400" />
                    Completed Teams
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
                </>
              )}
              {status === "finished" && (
                <div className="mt-4">
                  {judge.hasSwitchedFloors ? (
                    <span className="rounded-full bg-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300">
                      Switched
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CustomDropdown
                        value={targetFloorId}
                        onChange={setTargetFloorId}
                        options={floors
                          .filter((f) => f.id !== currentFloorId)
                          .map((f) => ({ value: f.id, label: f.name }))}
                        placeholder="Move to..."
                      />
                      <Button
                        onClick={() => onSwitchFloor(judge.id, targetFloorId)}
                        disabled={!targetFloorId}
                        size="sm"
                      >
                        Switch Floor
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main Dashboard Component ---
const AssignmentDashboard = () => {
  const { judges, teams, assignments, floors, currentEvent, showToast } =
    useAppContext();

  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [assignmentToScore, setAssignmentToScore] = useState<Assignment | null>(
    null,
  );
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedFloorId, setSelectedFloorId] = useState("");
  const [expandedJudgeId, setExpandedJudgeId] = useState<string | null>(null);

  const [autoSelectedJudgeIds, setAutoSelectedJudgeIds] = useState<string[]>(
    [],
  );
  const [manualSelectedJudgeId, setManualSelectedJudgeId] = useState("");
  const [manualSelectedTeamIds, setManualSelectedTeamIds] = useState<string[]>(
    [],
  );
  const [teamSearch, setTeamSearch] = useState("");

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const judgeDetailsMap = useMemo(() => {
    const details = new Map<
      string,
      { completedTeams: Team[]; currentTeams: Team[]; isFinished: boolean }
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

      details.set(judge.id, {
        completedTeams: Array.from(completedIds)
          .map((id) => teamMap.get(id!))
          .filter((t): t is Team => !!t),
        currentTeams: currentIds
          .map((id) => teamMap.get(id!))
          .filter((t): t is Team => !!t),
        isFinished: !isPossible,
      });
    }
    return details;
  }, [judges, teams, assignments, selectedFloorId, teamMap]);

  const { busyJudges, assignableJudges, finishedJudges } = useMemo(() => {
    const floorJudges = judges.filter((j) => j.floorId === selectedFloorId);
    return {
      busyJudges: floorJudges.filter((j) => j.currentAssignmentId),
      assignableJudges: floorJudges.filter(
        (j) => !j.currentAssignmentId && !judgeDetailsMap.get(j.id)?.isFinished,
      ),
      finishedJudges: floorJudges.filter(
        (j) => !j.currentAssignmentId && judgeDetailsMap.get(j.id)?.isFinished,
      ),
    };
  }, [judges, selectedFloorId, judgeDetailsMap]);

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

  useEffect(() => {
    if (floors.length > 0 && !selectedFloorId) setSelectedFloorId(floors[0].id);
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
    if (!judge || judge.hasSwitchedFloors)
      return showToast("This judge has already switched floors.", "warning");
    if (!newFloorId)
      return showToast("Please select a destination floor.", "error");
    const judgeRef = doc(db, `events/${currentEvent!.id}/judges`, judgeId);
    try {
      await updateDoc(judgeRef, {
        floorId: newFloorId,
        hasSwitchedFloors: true,
      });
      showToast(`${judge.name} moved successfully.`, "success");
    } catch (error) {
      showToast("Failed to switch floor.", "error");
    }
  };

  const handleRemoveAssignment = async (
    assignmentId: string,
    judgeId: string,
  ) => {
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
        `events/${currentEvent!.id}/assignments`,
        assignmentId,
      );
      const judgeRef = doc(db, `events/${currentEvent!.id}/judges`, judgeId);

      batch.delete(assignmentRef);
      batch.update(judgeRef, { currentAssignmentId: null });

      await batch.commit();
      showToast("Assignment successfully removed.", "success");
    } catch (error) {
      console.error("Failed to remove assignment:", error);
      showToast("An error occurred while removing the assignment.", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  const generateAssignments = async () => {
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
      const failedAssignments = []; // <-- For tracking failures

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
          // This case is rare but possible if candidateTeams < 5
          failedAssignments.push({
            judgeName: judge.name,
            reason: "no suitable group found",
          });
        }
      }

      // --- New Comprehensive Feedback Logic ---

      // 1. Handle and commit successful assignments
      if (newAssignmentsToCreate.length > 0) {
        const batch = writeBatch(db);
        for (const { judge, teams } of newAssignmentsToCreate) {
          const assignmentRef = doc(
            collection(db, `events/${currentEvent!.id}/assignments`),
          );
          batch.set(assignmentRef, {
            judgeId: judge.id,
            teamIds: teams.map((t) => t.id),
            submitted: false,
            createdAt: Timestamp.now(),
            floorId: selectedFloorId,
          });
          batch.update(doc(db, `events/${currentEvent!.id}/judges`, judge.id), {
            currentAssignmentId: assignmentRef.id,
          });
        }
        await batch.commit();
        showToast(
          `${newAssignmentsToCreate.length} assignment(s) created!`,
          "success",
        );
        setAutoSelectedJudgeIds([]); // Clear selection on success
      }

      // 2. Report any failures with specific reasons
      if (failedAssignments.length > 0) {
        const failureSummary = failedAssignments
          .map((f) => `${f.judgeName} (${f.reason})`)
          .join("; ");
        showToast(`Could not assign: ${failureSummary}`, "warning", {
          duration: 8000, // Show for 8 seconds
        });
      }

      // 3. Handle case where nothing was done
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
    if (!manualSelectedJudgeId)
      return showToast("Please select a judge.", "error");
    if (manualSelectedTeamIds.length === 0)
      return showToast("Please select at least one team.", "error");
    setIsAssigning(true);
    try {
      const batch = writeBatch(db);
      const assignmentRef = doc(
        collection(db, `events/${currentEvent!.id}/assignments`),
      );
      batch.set(assignmentRef, {
        judgeId: manualSelectedJudgeId,
        teamIds: manualSelectedTeamIds,
        submitted: false,
        createdAt: Timestamp.now(),
        floorId: selectedFloorId,
      });
      batch.update(
        doc(db, `events/${currentEvent!.id}/judges`, manualSelectedJudgeId),
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

  if (assignmentToScore)
    return (
      <ScoreEntryForm
        assignment={assignmentToScore}
        onBack={() => setAssignmentToScore(null)}
      />
    );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* --- LEFT COLUMN: CONTROLS --- */}
      <div className="flex flex-col gap-6">
        <MotionCard>
          <label className="mb-2 block font-semibold">
            Viewing & Assigning on Floor
          </label>
          <CustomDropdown
            value={selectedFloorId}
            onChange={setSelectedFloorId}
            options={floors.map((f) => ({ value: f.id, label: f.name }))}
            placeholder="Select a floor to manage"
          />
        </MotionCard>

        <div className="flex border-b border-zinc-700">
          <button
            onClick={() => setMode("auto")}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${mode === "auto" ? "border-b-2 border-orange-500 text-orange-500" : "text-zinc-400 hover:text-white"}`}
          >
            <SlidersHorizontal className="size-4" /> Auto Generator
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${mode === "manual" ? "border-b-2 border-orange-500 text-orange-500" : "text-zinc-400 hover:text-white"}`}
          >
            <UserCheck className="size-4" /> Manual Assignment
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {mode === "auto" && (
              <Card>
                <h2 className="mb-4 text-xl font-bold text-zinc-100">
                  Auto-Assignment Generator
                </h2>
                <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="font-semibold text-zinc-300">
                      Select Assignable Judges ({assignableJudges.length})
                    </label>
                    <button
                      onClick={toggleSelectAllJudges}
                      className="rounded bg-zinc-600 px-2 py-1 text-xs hover:bg-zinc-500"
                    >
                      {autoSelectedJudgeIds.length === assignableJudges.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>
                  <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
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
                          <span className="text-sm font-medium">{j.name}</span>
                        </label>
                      ))
                    ) : (
                      <p className="pt-4 text-center text-xs text-zinc-500 italic">
                        No assignable judges on this floor.
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={generateAssignments}
                  disabled={
                    !autoSelectedJudgeIds.length ||
                    !selectedFloorId ||
                    isAssigning
                  }
                  className="mt-4 w-full bg-gradient-to-br from-orange-500 to-orange-600 transition-all duration-150 hover:from-orange-600 hover:to-orange-700"
                >
                  {isAssigning
                    ? "Assigning..."
                    : `Generate & Assign (${autoSelectedJudgeIds.length})`}
                </Button>
              </Card>
            )}

            {mode === "manual" && (
              <Card>
                <h2 className="mb-4 text-xl font-bold text-zinc-100">
                  Manual Assignment
                </h2>
                <div className="space-y-4">
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
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
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
                    <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
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
                            <span className="text-xs text-zinc-400">
                              {hasJudged
                                ? "Judged"
                                : `Reviews: ${team.reviewedBy.length}`}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <Button
                    onClick={createManualAssignment}
                    disabled={
                      !manualSelectedJudgeId ||
                      manualSelectedTeamIds.length === 0 ||
                      isAssigning
                    }
                    className="w-full bg-gradient-to-br from-indigo-500 to-indigo-600"
                  >
                    {isAssigning ? "Assigning..." : `Create Manual Assignment`}
                  </Button>
                </div>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* --- RIGHT COLUMN: JUDGE STATUS --- */}
      <MotionCard className="custom-scrollbar max-h-[85vh] overflow-y-auto p-4">
        <h2 className="sticky top-0 z-10 mb-4 bg-zinc-900/50 py-2 text-xl font-bold backdrop-blur-sm">
          Judge Status Dashboard
        </h2>

        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold text-amber-400">
            Busy ({busyJudges.length})
          </h3>
          <div className="space-y-2">
            {busyJudges.map((judge) => {
              const assignment = assignments.find(
                (a) => a.id === judge.currentAssignmentId,
              );
              return (
                <JudgeStatusCard
                  key={judge.id}
                  judge={judge}
                  details={judgeDetailsMap.get(judge.id)!}
                  assignment={assignment}
                  isExpanded={expandedJudgeId === judge.id}
                  onToggle={() =>
                    setExpandedJudgeId((p) =>
                      p === judge.id ? null : judge.id,
                    )
                  }
                  onEnterScores={setAssignmentToScore}
                  onSwitchFloor={handleSwitchFloor}
                  onRemoveAssignment={handleRemoveAssignment}
                  floors={floors}
                  currentFloorId={selectedFloorId}
                />
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="mb-3 text-lg font-semibold text-emerald-400">
            Assignable ({assignableJudges.length})
          </h3>
          <div className="space-y-2">
            {assignableJudges.map((judge) => (
              <JudgeStatusCard
                key={judge.id}
                judge={judge}
                details={judgeDetailsMap.get(judge.id)!}
                assignment={undefined}
                isExpanded={expandedJudgeId === judge.id}
                onToggle={() =>
                  setExpandedJudgeId((p) => (p === judge.id ? null : judge.id))
                }
                onEnterScores={setAssignmentToScore}
                onSwitchFloor={handleSwitchFloor}
                onRemoveAssignment={handleRemoveAssignment}
                floors={floors}
                currentFloorId={selectedFloorId}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold text-sky-400">
            Finished ({finishedJudges.length})
          </h3>
          <div className="space-y-2">
            {finishedJudges.map((judge) => (
              <JudgeStatusCard
                key={judge.id}
                judge={judge}
                details={judgeDetailsMap.get(judge.id)!}
                assignment={undefined}
                isExpanded={expandedJudgeId === judge.id}
                onToggle={() =>
                  setExpandedJudgeId((p) => (p === judge.id ? null : judge.id))
                }
                onEnterScores={setAssignmentToScore}
                onSwitchFloor={handleSwitchFloor}
                onRemoveAssignment={handleRemoveAssignment}
                floors={floors}
                currentFloorId={selectedFloorId}
              />
            ))}
          </div>
        </div>
      </MotionCard>
    </div>
  );
};

export default AssignmentDashboard;
