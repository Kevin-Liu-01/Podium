// pages/FloorDashboard.tsx
"use client";
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Added AnimatePresence
import { doc, updateDoc, writeBatch } from "firebase/firestore"; // Added Firestore imports
import { useAppContext } from "../../context/AppContext"; // Ensure path is correct
import type { Floor, Judge, Team, Assignment } from "../../lib/types"; // Ensure path is correct
import { getColorForJudge } from "../../lib/utils"; // Ensure path is correct
import { staggerContainer, fadeInUp } from "../../lib/animations"; // Ensure path is correct
import MotionCard from "../ui/MotionCard"; // Ensure paths are correct
import TeamCard from "../shared/TeamCard"; // Ensure path is correct
import ScoreDetailModal from "../shared/ScoreDetailModal"; // Ensure path is correct
import ScoreEntryForm from "../shared/ScoreEntryForm"; // Ensure path is correct
import { Button } from "../ui/Button"; // Ensure path is correct
import {
  PlusIcon,
  AlertTriangle,
  Loader2,
  XCircle,
  SlidersHorizontal,
} from "lucide-react"; // Added icons
import { db } from "../../firebase/config"; // Added db
import Tooltip from "../ui/Tooltip"; // Added Tooltip
import JudgeDetailsModal from "../shared/JudgeDetailsModal"; // <--- Import shared modal

const FloorDashboard = ({ floor }: { floor: Floor }) => {
  const { teams, judges, assignments, currentEvent, user, floors, showToast } =
    useAppContext(); // Added user, showToast
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [assignmentToScore, setAssignmentToScore] = useState<Assignment | null>(
    null,
  );

  // State for Modal
  const [viewingJudge, setViewingJudge] = useState<Judge | null>(null);
  // Separate loading states for clarity, although modal manages its own internal switching state
  const [isHandlingSwitchFloor, setIsHandlingSwitchFloor] = useState(false);
  const [isHandlingRemoveAssignment, setIsHandlingRemoveAssignment] =
    useState(false);

  const floorTeams = useMemo(
    () =>
      teams
        .filter((t) => t.floorId === floor.id)
        .sort((a, b) => a.number - b.number),
    [teams, floor.id],
  );

  const assignedJudgesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    const activeAssignments = assignments.filter((a) => !a.submitted);
    for (const assignment of activeAssignments) {
      if (assignment.judgeId && Array.isArray(assignment.teamIds)) {
        for (const teamId of assignment.teamIds) {
          const existing = map.get(teamId) || [];
          map.set(teamId, [...existing, assignment.judgeId]);
        }
      }
    }
    return map;
  }, [assignments]);

  const { judgesOut, judgesAvailable, judgesFinished } = useMemo(() => {
    if (!judges || !teams || !assignments)
      return { judgesOut: [], judgesAvailable: [], judgesFinished: [] };
    const floorJudges = judges.filter((j) => j.floorId === floor.id);
    const teamsOnFloor = teams.filter((t) => t.floorId === floor.id);
    const allSubmittedAssignments = assignments.filter((a) => a.submitted);
    const out = floorJudges.filter((j) => j.currentAssignmentId);
    const available = floorJudges.filter((j) => !j.currentAssignmentId);
    const finished: Judge[] = [];
    const stillAssignable: Judge[] = [];
    for (const judge of available) {
      const judgedTeamIds = new Set(
        allSubmittedAssignments
          .filter((a) => a.judgeId === judge.id)
          .flatMap((a) => a.teamIds),
      );
      const candidateTeams = teamsOnFloor.filter(
        (t) => !judgedTeamIds.has(t.id),
      );
      let isPossible = false;
      if (candidateTeams.length >= 5) {
        // Simplified check, full logic in AssignmentDashboard
        isPossible = true;
      }
      const hasJudged = judgedTeamIds.size > 0;
      if (!isPossible && hasJudged) {
        finished.push(judge);
      } else {
        stillAssignable.push(judge);
      }
    }
    return {
      judgesOut: out,
      judgesAvailable: stillAssignable,
      judgesFinished: finished,
    };
  }, [judges, teams, assignments, floor.id]);

  // --- Handlers for Modal Actions ---
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

    setIsHandlingSwitchFloor(true); // Indicate parent is processing
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
      // Modal will close itself on success
    } catch (error) {
      showToast("Failed to switch floor.", "error");
      console.error("Floor switch error:", error);
      throw error; // Re-throw so modal knows it failed
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
    // Confirmation handled by modal
    setIsHandlingRemoveAssignment(true); // Indicate parent is processing
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
      // Modal will close itself on success
    } catch (error) {
      console.error("Failed to remove assignment:", error);
      showToast("An error occurred while removing the assignment.", "error");
      throw error; // Re-throw
    } finally {
      setIsHandlingRemoveAssignment(false);
    }
  };

  // --- Judge List Component ---
  const JudgeList = ({
    title,
    judges: judgeList,
    color,
    canOpenModal = false,
  }: {
    title: string;
    judges: Judge[];
    color: string;
    canOpenModal?: boolean;
  }) => (
    <MotionCard className="h-full">
      <h2 className={`mb-3 text-lg font-semibold ${color}`}>
        {title} ({judgeList.length})
      </h2>
      <div className="custom-scrollbar grid max-h-40 grid-cols-1 gap-2 overflow-y-auto pr-2 sm:grid-cols-2">
        {judgeList.length > 0 ? (
          judgeList.map((judge) => (
            <Tooltip
              key={judge.id}
              content="View Details / Move"
              position="top"
              disabled={!canOpenModal}
            >
              <div
                className={`flex w-full items-center justify-between gap-3 rounded-md border border-zinc-700/50 bg-zinc-800 p-2 text-sm ${canOpenModal ? "cursor-pointer hover:bg-zinc-700" : ""}`}
                onClick={
                  canOpenModal ? () => setViewingJudge(judge) : undefined
                }
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span
                    className={`h-2 w-2 flex-shrink-0 rounded-full ${getColorForJudge(judge.id)}`}
                  ></span>
                  <span className="truncate font-medium" title={judge.name}>
                    {judge.name}
                  </span>
                </div>
                <SlidersHorizontal className="size-3" />
              </div>
            </Tooltip>
          ))
        ) : (
          <div className="flex h-full w-full flex-grow items-center justify-center text-center text-sm text-zinc-500 italic sm:col-span-2">
            No judges in this category.
          </div>
        )}
      </div>
    </MotionCard>
  );

  // Score Entry Form Rendering
  if (assignmentToScore) {
    return (
      <ScoreEntryForm
        assignment={assignmentToScore}
        onBack={() => setAssignmentToScore(null)}
      />
    );
  }

  // Robustness Check
  if (!currentEvent || !floor) {
    return (
      <MotionCard className="p-8 text-center text-zinc-400">
        Loading dashboard or data is unavailable...
      </MotionCard>
    );
  }

  return (
    <div>
      {/* Judge Status Cards */}
      <MotionCard className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/50 shadow-lg shadow-black/30">
        <div className="mb-6 flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
          <h1 className="text-3xl font-bold">{floor.name} Dashboard</h1>
          <p className="text-lg text-zinc-400">{floorTeams.length} Teams</p>
        </div>
        <motion.div
          className="grid grid-cols-1 gap-6 md:grid-cols-3"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Judges Out */}
          <MotionCard variants={fadeInUp}>
            <h2 className="mb-3 text-lg font-semibold text-amber-400">
              Judges Out ({judgesOut.length})
            </h2>
            <div className="custom-scrollbar max-h-40 space-y-2 overflow-y-auto pr-2">
              {judgesOut.length > 0 ? (
                judgesOut.map((judge) => {
                  const assignment = assignments.find(
                    (a) => a.id === judge.currentAssignmentId,
                  );
                  return (
                    <div
                      key={judge.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-700/50 bg-zinc-800 p-2 text-sm"
                    >
                      <Tooltip content="View Details / Move" position="right">
                        <div
                          className="flex flex-grow cursor-pointer items-center gap-3 overflow-hidden rounded p-1 hover:bg-zinc-700"
                          onClick={() => setViewingJudge(judge)}
                        >
                          <span
                            className={`h-2 w-2 flex-shrink-0 rounded-full ${getColorForJudge(judge.id)}`}
                          ></span>
                          <span
                            className="truncate font-medium"
                            title={judge.name}
                          >
                            {judge.name}
                          </span>
                        </div>
                      </Tooltip>
                      {assignment && (
                        <Tooltip content="Enter scores for this assignment">
                          <div>
                            <Button
                              onClick={() => setAssignmentToScore(assignment)}
                              size="sm"
                              className="ml-2 flex-shrink-0 bg-orange-600 hover:bg-orange-500"
                            >
                              <PlusIcon className="size-4" /> Scores
                            </Button>
                          </div>
                        </Tooltip>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="py-8 text-center text-sm text-zinc-500 italic">
                  No judges are currently out.
                </p>
              )}
            </div>
          </MotionCard>
          {/* Available Judges - Make clickable */}
          <motion.div variants={fadeInUp}>
            <JudgeList
              title="Available Judges"
              judges={judgesAvailable}
              color="text-emerald-400"
              canOpenModal={true}
            />
          </motion.div>
          {/* Finished Judges - Make clickable */}
          <motion.div variants={fadeInUp}>
            <JudgeList
              title="Finished on Floor"
              judges={judgesFinished}
              color="text-sky-400"
              canOpenModal={true}
            />
          </motion.div>
        </motion.div>
      </MotionCard>

      {/* Team Cards */}
      <MotionCard className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/50 shadow-lg shadow-black/30">
        <p className="mb-4 text-zinc-400">
          {floorTeams?.length > 0
            ? "Click on a team to see detailed scores."
            : "No teams assigned to this floor yet."}
        </p>
        <motion.div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {floorTeams.length > 0
            ? floorTeams.map((team) => {
                const assignedJudgeIds = assignedJudgesMap.get(team.id) || [];
                return (
                  <motion.div variants={fadeInUp} key={team.id}>
                    <TeamCard
                      team={team}
                      onClick={() => setSelectedTeam(team)}
                      assignedJudgeIds={assignedJudgeIds}
                    />
                  </motion.div>
                );
              })
            : Array.from({ length: 4 }).map((_, index) => (
                <motion.div variants={fadeInUp} key={index}>
                  <div className="animate-pulse rounded-lg bg-zinc-800 p-4">
                    <div className="mb-2 h-6 w-3/4 rounded bg-zinc-700"></div>
                    <div className="mb-4 h-4 w-1/2 rounded bg-zinc-700"></div>
                    <div className="h-4 w-full rounded bg-zinc-700"></div>
                    <div className="mt-2 h-4 w-5/6 rounded bg-zinc-700"></div>
                  </div>
                </motion.div>
              ))}
        </motion.div>
      </MotionCard>

      {/* Render Modals */}
      {selectedTeam && (
        <ScoreDetailModal
          team={selectedTeam}
          onClose={() => setSelectedTeam(null)}
        />
      )}

      {/* Render Shared JudgeDetailsModal */}
      <JudgeDetailsModal
        isOpen={!!viewingJudge}
        judge={viewingJudge}
        assignments={assignments}
        teams={teams}
        floors={floors}
        onClose={() => setViewingJudge(null)}
        onSwitchFloor={handleSwitchFloor}
        onRemoveAssignment={handleRemoveAssignment}
        // No currentFloorId needed, inferred from judge
      />
    </div>
  );
};

export default FloorDashboard;
