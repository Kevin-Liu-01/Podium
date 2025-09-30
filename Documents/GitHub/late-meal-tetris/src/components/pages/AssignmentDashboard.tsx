import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, writeBatch, collection, Timestamp } from "firebase/firestore";
import { SlidersHorizontal, UserCheck } from "lucide-react";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { Assignment, Judge, Project } from "../../lib/types";
import { Card } from "../ui/Card";
import MotionCard from "../ui/MotionCard";
import { Button } from "../ui/Button";
import { CustomDropdown } from "../ui/CustomDropdown";
import { Input } from "../ui/Input";
import ScoreEntryForm from "../shared/ScoreEntryForm";

const AssignmentDashboard = () => {
  const { judges, projects, assignments, floors, currentEvent, showToast } =
    useAppContext();
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const [assignmentToScore, setAssignmentToScore] = useState<Assignment | null>(
    null,
  );
  const [autoSelectedJudgeIds, setAutoSelectedJudgeIds] = useState<string[]>(
    [],
  );
  const [autoSelectedFloorId, setAutoSelectedFloorId] = useState("");
  const [manualSelectedJudgeId, setManualSelectedJudgeId] = useState("");
  const [manualSelectedFloorId, setManualSelectedFloorId] = useState("");
  const [manualSelectedProjectIds, setManualSelectedProjectIds] = useState<
    string[]
  >([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const availableJudges = useMemo(
    () => judges.filter((j) => !j.currentAssignmentId),
    [judges],
  );

  const busyJudges = useMemo(
    () =>
      judges
        .filter((j) => j.currentAssignmentId)
        .map((judge) => {
          const assignment = assignments.find(
            (a) => a.id === judge.currentAssignmentId,
          );
          const floor = floors.find((f) => f.id === assignment?.floorId);
          return { judge, assignment, floor };
        }),
    [judges, assignments, floors],
  );

  useEffect(() => {
    if (floors.length > 0) {
      if (!autoSelectedFloorId) setAutoSelectedFloorId(floors[0].id);
      if (!manualSelectedFloorId) setManualSelectedFloorId(floors[0].id);
    }
    if (availableJudges.length > 0 && !manualSelectedJudgeId) {
      setManualSelectedJudgeId(availableJudges[0].id);
    }
  }, [
    floors,
    availableJudges,
    autoSelectedFloorId,
    manualSelectedFloorId,
    manualSelectedJudgeId,
  ]);

  useEffect(() => {
    setManualSelectedProjectIds([]);
    setProjectSearch("");
  }, [manualSelectedJudgeId, manualSelectedFloorId]);

  const handleToggleJudge = (judgeId: string) => {
    setAutoSelectedJudgeIds((prev) =>
      prev.includes(judgeId)
        ? prev.filter((id) => id !== judgeId)
        : [...prev, judgeId],
    );
  };

  const toggleSelectAllJudges = () => {
    const allAvailableIds = availableJudges.map((j) => j.id);
    if (autoSelectedJudgeIds.length === allAvailableIds.length) {
      setAutoSelectedJudgeIds([]);
    } else {
      setAutoSelectedJudgeIds(allAvailableIds);
    }
  };

  const generateAssignments = async () => {
    if (autoSelectedJudgeIds.length === 0)
      return showToast("Please select at least one judge.", "error");
    if (!autoSelectedFloorId)
      return showToast("Please select a floor.", "error");

    setIsAssigning(true);
    try {
      const ASSIGNMENT_SIZE = 5;
      const MAX_REVIEWS = 5;
      const activeReviewCounts = new Map<string, number>();
      assignments
        .filter((a) => !a.submitted)
        .forEach((a) => {
          a.projectIds.forEach((pid) => {
            activeReviewCounts.set(pid, (activeReviewCounts.get(pid) || 0) + 1);
          });
        });

      const batch = writeBatch(db);
      let assignmentsCreated = 0;
      const selectedJudges = autoSelectedJudgeIds
        .map((id) => judges.find((j) => j.id === id))
        .filter((j): j is Judge => !!j)
        .sort((a, b) => a.name.localeCompare(b.name));

      for (const judge of selectedJudges) {
        const eligibleProjects = projects
          .filter(
            (p) =>
              p.floorId === autoSelectedFloorId &&
              p.roomId &&
              p.reviewedBy.length + (activeReviewCounts.get(p.id) || 0) <
                MAX_REVIEWS &&
              !p.reviewedBy.some((rev) => rev.judgeId === judge.id),
          )
          .sort((a, b) => {
            const pressureA =
              a.reviewedBy.length + (activeReviewCounts.get(a.id) || 0);
            const pressureB =
              b.reviewedBy.length + (activeReviewCounts.get(b.id) || 0);
            if (pressureA !== pressureB) return pressureA - pressureB;
            return a.name.localeCompare(b.name);
          });

        if (eligibleProjects.length < ASSIGNMENT_SIZE) {
          showToast(
            `Skipping ${judge.name}: Not enough eligible projects.`,
            "info",
          );
          continue;
        }

        const projectIdsToAssign = eligibleProjects
          .slice(0, ASSIGNMENT_SIZE)
          .map((p) => p.id);
        projectIdsToAssign.forEach((pid) => {
          activeReviewCounts.set(pid, (activeReviewCounts.get(pid) || 0) + 1);
        });

        const assignmentRef = doc(
          collection(db, `events/${currentEvent!.id}/assignments`),
        );
        batch.set(assignmentRef, {
          judgeId: judge.id,
          projectIds: projectIdsToAssign,
          submitted: false,
          createdAt: Timestamp.now(),
          floorId: autoSelectedFloorId,
        });
        batch.update(doc(db, `events/${currentEvent!.id}/judges`, judge.id), {
          currentAssignmentId: assignmentRef.id,
        });
        assignmentsCreated++;
      }

      if (assignmentsCreated > 0) {
        await batch.commit();
        showToast(
          `${assignmentsCreated} assignment(s) created successfully!`,
          "success",
        );
        setAutoSelectedJudgeIds([]);
      } else {
        showToast("No new assignments were created.", "info");
      }
    } catch (error) {
      console.error("Failed to generate assignments:", error);
      showToast("An error occurred while creating assignments.", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleToggleProject = (projectId: string) => {
    setManualSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  };

  const createManualAssignment = async () => {
    if (!manualSelectedJudgeId)
      return showToast("Please select a judge.", "error");
    if (manualSelectedProjectIds.length === 0)
      return showToast("Please select at least one project.", "error");
    if (!manualSelectedFloorId)
      return showToast("Please select a floor.", "error");

    setIsAssigning(true);
    try {
      const batch = writeBatch(db);
      const assignmentRef = doc(
        collection(db, `events/${currentEvent!.id}/assignments`),
      );

      batch.set(assignmentRef, {
        judgeId: manualSelectedJudgeId,
        projectIds: manualSelectedProjectIds,
        submitted: false,
        createdAt: Timestamp.now(),
        floorId: manualSelectedFloorId,
      });

      batch.update(
        doc(db, `events/${currentEvent!.id}/judges`, manualSelectedJudgeId),
        {
          currentAssignmentId: assignmentRef.id,
        },
      );

      await batch.commit();
      showToast("Manual assignment created successfully!", "success");
      setManualSelectedProjectIds([]);
    } catch (error) {
      console.error("Failed to create manual assignment:", error);
      showToast("An error occurred during manual assignment.", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  const manualModeProjects = useMemo(
    () =>
      projects
        .filter((p) => p.floorId === manualSelectedFloorId && p.roomId)
        .filter((p) =>
          p.name.toLowerCase().includes(projectSearch.toLowerCase()),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [projects, manualSelectedFloorId, projectSearch],
  );

  if (assignmentToScore) {
    return (
      <ScoreEntryForm
        assignment={assignmentToScore}
        onBack={() => setAssignmentToScore(null)}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
      <div className="space-y-6 md:col-span-3">
        <div className="flex border-b border-zinc-700">
          <button
            onClick={() => setMode("auto")}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${
              mode === "auto"
                ? "border-b-2 border-orange-500 text-orange-500"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <SlidersHorizontal className="size-4" /> Auto Generator
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold transition-colors ${
              mode === "manual"
                ? "border-b-2 border-orange-500 text-orange-500"
                : "text-zinc-400 hover:text-white"
            }`}
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
            {mode === "auto" ? (
              <Card>
                <h2 className="mb-4 text-xl font-bold text-zinc-100">
                  Auto-Assignment Generator
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <label className="font-semibold text-zinc-300">
                          Available Judges ({availableJudges.length})
                        </label>
                        <button
                          onClick={toggleSelectAllJudges}
                          className="rounded bg-zinc-600 px-2 py-1 text-xs hover:bg-zinc-500"
                        >
                          {autoSelectedJudgeIds.length ===
                          availableJudges.length
                            ? "Deselect All"
                            : "Select All"}
                        </button>
                      </div>
                      <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                        {availableJudges.map((judge) => (
                          <label
                            key={judge.id}
                            className="flex cursor-pointer items-center space-x-3 rounded p-2 transition-colors hover:bg-zinc-700"
                          >
                            <input
                              type="checkbox"
                              checked={autoSelectedJudgeIds.includes(judge.id)}
                              onChange={() => handleToggleJudge(judge.id)}
                              className="size-4 cursor-pointer rounded border-zinc-600 bg-zinc-900 text-orange-600 focus:ring-2 focus:ring-orange-500/50"
                            />
                            <span className="text-sm font-medium">
                              {judge.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block font-semibold">Floor</label>
                      <CustomDropdown
                        value={autoSelectedFloorId}
                        onChange={setAutoSelectedFloorId}
                        options={floors.map((f) => ({
                          value: f.id,
                          label: f.name,
                        }))}
                        placeholder="Select a floor"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={generateAssignments}
                    disabled={
                      !autoSelectedJudgeIds.length ||
                      !autoSelectedFloorId ||
                      isAssigning
                    }
                    className="w-full"
                  >
                    {isAssigning
                      ? "Assigning..."
                      : `Generate & Assign (${autoSelectedJudgeIds.length})`}
                  </Button>
                </div>
              </Card>
            ) : (
              <Card>
                <h2 className="mb-4 text-xl font-bold text-zinc-100">
                  Manual Assignment
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block font-semibold">Judge</label>
                      <CustomDropdown
                        value={manualSelectedJudgeId}
                        onChange={setManualSelectedJudgeId}
                        options={availableJudges.map((j) => ({
                          value: j.id,
                          label: j.name,
                        }))}
                        placeholder="Select a judge"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block font-semibold">Floor</label>
                      <CustomDropdown
                        value={manualSelectedFloorId}
                        onChange={setManualSelectedFloorId}
                        options={floors.map((f) => ({
                          value: f.id,
                          label: f.name,
                        }))}
                        placeholder="Select a floor"
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3">
                    <div className="mb-3">
                      <label className="mb-2 block font-semibold text-zinc-300">
                        Projects ({manualModeProjects.length})
                      </label>
                      <Input
                        type="text"
                        placeholder="Search projects..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                      {manualModeProjects.map((project) => {
                        const isJudged = project.reviewedBy.some(
                          (r) => r.judgeId === manualSelectedJudgeId,
                        );
                        return (
                          <label
                            key={project.id}
                            className={`flex cursor-pointer items-center justify-between rounded p-2 transition-colors ${isJudged ? "cursor-not-allowed opacity-50" : "hover:bg-zinc-700"}`}
                          >
                            <div className="flex items-center space-x-3">
                              <input
                                type="checkbox"
                                checked={manualSelectedProjectIds.includes(
                                  project.id,
                                )}
                                onChange={() => handleToggleProject(project.id)}
                                disabled={isJudged}
                                className="size-4 cursor-pointer rounded border-zinc-600 bg-zinc-900 text-orange-600 focus:ring-2 focus:ring-orange-500/50 disabled:cursor-not-allowed"
                              />
                              <span className="text-sm font-medium">
                                {project.name}
                              </span>
                            </div>
                            <span className="text-xs text-zinc-400">
                              {isJudged
                                ? "Judged"
                                : `Reviews: ${project.reviewedBy.length}`}
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
                      !manualSelectedProjectIds.length ||
                      isAssigning
                    }
                    className="w-full"
                  >
                    {isAssigning
                      ? "Assigning..."
                      : `Create Manual Assignment (${manualSelectedProjectIds.length} projects)`}
                  </Button>
                </div>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="md:col-span-2">
        <MotionCard>
          <h2 className="mb-4 text-2xl font-bold text-amber-400">
            Busy Judges ({busyJudges.length})
          </h2>
          <div className="max-h-[30rem] space-y-3 overflow-y-auto">
            {busyJudges.length > 0 ? (
              busyJudges.map(({ judge, assignment, floor }) => (
                <div key={judge.id} className="rounded-lg bg-zinc-800 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{judge.name}</p>
                      <p className="text-sm text-zinc-400">
                        Assigned {assignment?.projectIds.length || 0} projects
                        on {floor?.name}
                      </p>
                    </div>
                    {assignment && (
                      <Button
                        onClick={() => setAssignmentToScore(assignment)}
                        className="bg-emerald-600 hover:bg-emerald-500"
                      >
                        Enter Scores
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-zinc-400 italic">
                No judges are currently busy.
              </p>
            )}
          </div>
        </MotionCard>
      </div>
    </div>
  );
};

export default AssignmentDashboard;
