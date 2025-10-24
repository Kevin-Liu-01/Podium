"use client";
import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronsRight,
  History,
  XCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useAppContext } from "../../context/AppContext";
import type { Assignment, Judge, Team, Floor } from "../../lib/types";
import { Button } from "../ui/Button";
import { CustomDropdown } from "../ui/CustomDropdown";
import Tooltip from "../ui/Tooltip";
import ConfirmationDialog from "../ui/ConfirmationDialog";

interface JudgeDetailsModalProps {
  judge: Judge | null; // Allow null to handle closing animation
  assignments: Assignment[];
  teams: Team[];
  floors: Floor[];
  isOpen: boolean; // Control visibility externally
  onClose: () => void;
  // Optional action handlers - parent decides if they are needed
  onSwitchFloor?: (judgeId: string, newFloorId: string) => Promise<void>;
  onRemoveAssignment?: (assignmentId: string, judgeId: string) => Promise<void>;
}

const JudgeDetailsModal = ({
  judge,
  assignments,
  teams,
  floors,
  isOpen,
  onClose,
  onSwitchFloor,
  onRemoveAssignment,
}: JudgeDetailsModalProps) => {
  const [targetFloorId, setTargetFloorId] = useState("");
  const [isSwitchingFloor, setIsSwitchingFloor] = useState(false);
  const [isRemovingAssignment, setIsRemovingAssignment] = useState(false); // Loading state for remove
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false); // Confirmation state

  // Internal calculation of team details
  const { completedTeams, currentTeams, currentAssignment } = useMemo(() => {
    if (!judge)
      return {
        completedTeams: [],
        currentTeams: [],
        currentAssignment: undefined,
      };

    const teamMap = new Map(teams.map((t) => [t.id, t]));
    const judgeAssignments = assignments.filter((a) => a.judgeId === judge.id);
    const currentAsmt = judgeAssignments.find((a) => !a.submitted);
    const completedAsmts = judgeAssignments.filter((a) => a.submitted);

    const completed = completedAsmts
      .flatMap((a) => a.teamIds)
      .map((id) => teamMap.get(id))
      .filter((t): t is Team => !!t);

    const current = currentAsmt
      ? currentAsmt.teamIds
          .map((id) => teamMap.get(id))
          .filter((t): t is Team => !!t)
      : [];

    return {
      completedTeams: completed,
      currentTeams: current,
      currentAssignment: currentAsmt,
    };
  }, [judge, assignments, teams]);

  // Reset target floor when judge changes or modal opens/closes
  useEffect(() => {
    if (isOpen && judge) {
      setTargetFloorId(""); // Reset on open
    }
  }, [isOpen, judge]);

  // --- Action Handlers ---

  const handleSwitchFloorClick = async () => {
    if (!onSwitchFloor || !judge || !targetFloorId) return;
    setIsSwitchingFloor(true);
    try {
      await onSwitchFloor(judge.id, targetFloorId);
      // Success feedback is handled by the parent's showToast
      onClose(); // Close modal on success
    } catch (error) {
      // Error feedback handled by parent
      console.error("Error switching floor:", error);
    } finally {
      setIsSwitchingFloor(false);
    }
  };

  const handleRemoveAssignmentClick = () => {
    if (!onRemoveAssignment || !currentAssignment || !judge) return;
    setShowRemoveConfirm(true); // Show confirmation first
  };

  const confirmRemoveAssignment = async () => {
    if (!onRemoveAssignment || !currentAssignment || !judge) return;
    setShowRemoveConfirm(false); // Close confirm dialog
    setIsRemovingAssignment(true);
    try {
      await onRemoveAssignment(currentAssignment.id, judge.id);
      // Success handled by parent
      onClose(); // Close modal on success
    } catch (error) {
      // Error handled by parent
      console.error("Error removing assignment:", error);
    } finally {
      setIsRemovingAssignment(false);
    }
  };

  const currentJudgeFloorId = judge?.floorId ?? ""; // Handle unassigned judge

  return (
    <>
      <AnimatePresence>
        {isOpen &&
          judge && ( // Render only if open and judge is provided
            <motion.div
              key="judge-modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              onClick={onClose} // Close on backdrop click
            >
              <motion.div
                key="judge-modal-content"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()} // Prevent closing on content click
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
                    aria-label="Close modal"
                  >
                    <XCircle className="size-6" />
                  </button>
                </div>

                <div className="mt-6 space-y-6 border-t border-zinc-800 pt-6">
                  {/* Current Assignment */}
                  {currentAssignment && (
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                        <ChevronsRight className="size-4 text-amber-400" />
                        Currently Evaluating
                      </h4>
                      {currentTeams.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {currentTeams?.map((t) => (
                            <span
                              key={t.id}
                              className="rounded bg-amber-900/50 px-2 py-1 text-xs font-medium text-amber-300"
                            >
                              {t.name} (#{t.number}) {/* Added team number */}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500 italic">
                          No teams currently assigned.
                        </p>
                      )}
                      {/* Only show Remove button if handler is provided */}
                      {onRemoveAssignment && (
                        <div className="mt-4">
                          <Tooltip
                            content="Permanently removes this active assignment. This cannot be undone."
                            position="right"
                          >
                            <div>
                              {" "}
                              {/* Tooltip requires a direct child */}
                              <Button
                                onClick={handleRemoveAssignmentClick}
                                disabled={isRemovingAssignment}
                                variant="destructive"
                                size="sm"
                                className="flex items-center gap-2"
                              >
                                {isRemovingAssignment ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <XCircle className="size-4" />
                                )}
                                Cancel Assignment
                              </Button>
                            </div>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Completed Assignments Count */}
                  <div>
                    <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                      <History className="size-4 text-zinc-400" />
                      Total Assignments Completed
                    </h4>
                    <p className="text-lg font-bold text-white">
                      {judge.completedAssignments}
                    </p>
                  </div>

                  {/* Completed Teams */}
                  {completedTeams.length > 0 && (
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                        <History className="size-4 text-emerald-400" />
                        Completed Teams ({completedTeams.length})
                      </h4>
                      <div className="max-h-32 overflow-y-auto pr-2">
                        {" "}
                        {/* Scrollable */}
                        <div className="flex flex-wrap gap-2">
                          {completedTeams.map((t) => (
                            <span
                              key={t.id}
                              className="rounded bg-emerald-900/50 px-2 py-1 text-xs font-medium text-emerald-300"
                            >
                              {t.name} (#{t.number}) {/* Added team number */}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Floor Switching Logic - only if handler is provided */}
                  {onSwitchFloor &&
                    !currentAssignment && ( // Can only switch if not busy
                      <div>
                        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-300">
                          <ChevronsRight className="size-4 text-sky-400" />
                          Move Judge to Different Floor
                        </h4>
                        {judge.hasSwitchedFloors ? (
                          <Tooltip
                            content="This judge has already moved from their original floor."
                            position="right"
                          >
                            <span className="inline-block rounded-full bg-zinc-700 px-3 py-1 text-sm font-semibold text-zinc-300">
                              Already Switched Floors
                            </span>
                          </Tooltip>
                        ) : (
                          <div className="flex items-center gap-2">
                            <CustomDropdown
                              value={targetFloorId}
                              onChange={setTargetFloorId}
                              options={floors
                                // Filter out the judge's current floor (even if unassigned)
                                .filter((f) => f.id !== currentJudgeFloorId)
                                .map((f) => ({ value: f.id, label: f.name }))}
                              placeholder="Select destination..."
                              className="flex-grow" // Allow dropdown to take space
                            />
                            <Tooltip
                              content="Move this judge to the selected floor. This can only be done once per judge."
                              position="left" // Adjusted position
                            >
                              <div>
                                {" "}
                                {/* Tooltip requires direct child */}
                                <Button
                                  onClick={handleSwitchFloorClick}
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
          )}
      </AnimatePresence>

      {/* Confirmation Dialog for Removing Assignment */}
      <ConfirmationDialog
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        onConfirm={confirmRemoveAssignment}
        title="Cancel Active Assignment?"
        icon={<AlertTriangle className="size-6 text-amber-500" />}
      >
        <p>
          Are you sure you want to cancel the current assignment for{" "}
          <strong>{judge?.name}</strong>?
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          The judge will become available for new assignments. This action
          cannot be undone.
        </p>
      </ConfirmationDialog>
    </>
  );
};

export default JudgeDetailsModal;
