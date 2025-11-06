"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  doc,
  deleteDoc,
  writeBatch,
  collection,
  updateDoc,
} from "firebase/firestore";
import {
  PlusCircle,
  Trash2,
  Users,
  Building2,
  Lock,
  Sparkles,
  Clock,
  History,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { Judge } from "../../lib/types";
import { staggerContainer } from "../../lib/animations";
import MotionCard from "../ui/MotionCard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import DroppableZone from "../dnd/DroppableZone";
import { Card } from "../ui/Card";
import Tooltip from "../ui/Tooltip";
import ConfirmationDialog from "../ui/ConfirmationDialog";
import DraggableJudgeOverlay from "../dnd/DraggableJudgeOverlay";

const AdminPanel = () => {
  // Get 'user' from context
  const { judges, floors, currentEvent, showToast, user } = useAppContext();

  const [judgeInput, setJudgeInput] = useState("");
  const [floorName, setFloorName] = useState("");
  const [teamStart, setTeamStart] = useState("");
  const [teamEnd, setTeamEnd] = useState("");

  const [judgeItems, setJudgeItems] = useState<Record<string, Judge[]>>({
    unassigned: [],
  });
  const [activeDragItem, setActiveDragItem] = useState<Judge | null>(null);

  // State for the confirmation dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletionArgs, setDeletionArgs] = useState<{
    id: string;
    name: string;
    type: "judge" | "floor";
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const sortedFloors = useMemo(
    () => [...floors].sort((a, b) => a.teamNumberStart - b.teamNumberStart),
    [floors],
  );

  const unassignedJudges = useMemo(
    () => judgeItems.unassigned || [],
    [judgeItems],
  );

  const floorMap = useMemo(() => {
    return new Map(floors.map((f) => [f.id, f.name]));
  }, [floors]);

  useEffect(() => {
    const groupedByFloor = Object.fromEntries(
      floors.map((f) => [f.id, judges.filter((j) => j.floorId === f.id)]),
    );
    setJudgeItems({
      unassigned: judges.filter((j) => !j.floorId),
      ...groupedByFloor,
    });
  }, [judges, floors]);

  // --- [FIXED] Updated path to include user.uid ---
  const getCollectionPath = (col: string) => {
    if (!user || !currentEvent) {
      throw new Error("User or event not loaded");
    }
    return `users/${user.uid}/events/${currentEvent.id}/${col}`;
  };

  // --- Deletion Logic ---

  // These functions just open the dialog
  const handleDeleteFloor = (id: string, name: string) => {
    setDeletionArgs({ id, name, type: "floor" });
    setIsDialogOpen(true);
  };

  const handleDeleteJudge = (id: string, name: string) => {
    setDeletionArgs({ id, name, type: "judge" });
    setIsDialogOpen(true);
  };

  // These functions contain the actual deletion logic
  const executeDeleteFloor = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, getCollectionPath("floors"), id));
      showToast(`"${name}" deleted successfully.`, "success");
    } catch (e) {
      showToast(`Failed to delete "${name}".`, "error");
    }
  };

  const executeDeleteJudge = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, getCollectionPath("judges"), id));
      showToast(`Judge "${name}" deleted successfully.`, "success");
    } catch (e) {
      showToast(`Failed to delete "${name}".`, "error");
    }
  };

  // Dialog open/close handlers
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setDeletionArgs(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletionArgs || !user || !currentEvent) return;

    if (deletionArgs.type === "floor") {
      await executeDeleteFloor(deletionArgs.id, deletionArgs.name);
    } else if (deletionArgs.type === "judge") {
      await executeDeleteJudge(deletionArgs.id, deletionArgs.name);
    }

    handleCloseDialog();
  };

  // --- End Deletion Logic ---

  const handleAddJudges = async () => {
    if (!user || !currentEvent) return;
    const names = judgeInput
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return showToast("Input is empty.", "info");

    const batch = writeBatch(db);
    const existingJudges = new Map(
      judges.map((j) => [j.name.toLowerCase(), true]),
    );

    for (const name of names) {
      if (existingJudges.has(name.toLowerCase())) {
        showToast(`Judge "${name}" already exists. Skipping.`, "info");
        continue;
      }
      const newRef = doc(collection(db, getCollectionPath("judges")));
      batch.set(newRef, {
        name,
        completedAssignments: 0,
        currentAssignmentId: null,
        floorId: "",
        hasSwitchedFloors: false,
      });
    }
    await batch.commit();
    showToast(`${names.length} judge(s) added successfully!`, "success");
    setJudgeInput("");
  };

  const handleAddFloor = async () => {
    if (!user || !currentEvent) return;
    if (!floorName.trim() || !teamStart || !teamEnd)
      return showToast("All floor fields are required.", "error");

    const start = parseInt(teamStart);
    const end = parseInt(teamEnd);

    if (isNaN(start) || isNaN(end) || start <= 0 || end < start)
      return showToast("Invalid team number range.", "error");

    for (const floor of floors) {
      const existingStart = floor.teamNumberStart;
      const existingEnd = floor.teamNumberEnd;
      if (start <= existingEnd && existingStart <= end) {
        showToast(
          `Range overlaps with "${floor.name}" (${existingStart}-${existingEnd}).`,
          "error",
        );
        return;
      }
    }

    const batch = writeBatch(db);
    const newRef = doc(collection(db, getCollectionPath("floors")));
    batch.set(newRef, {
      name: floorName,
      index: floors.length,
      teamNumberStart: start,
      teamNumberEnd: end,
    });
    await batch.commit();
    showToast(`Floor "${floorName}" added!`, "success");
    setFloorName("");
    setTeamStart("");
    setTeamEnd("");
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(judges.find((j) => j.id === event.active.id) || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!user || !currentEvent) return;
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const judgeToMove = judges.find((j) => j.id === activeId);
    if (!judgeToMove) return;

    // Check for lock: ONLY block moving if judge has an ACTIVE assignment.
    // Completed assignments (history) no longer lock a judge from being moved.
    if (judgeToMove.currentAssignmentId) {
      showToast(
        `${judgeToMove.name} cannot be moved while they have an active assignment.`,
        "warning",
      );
      return;
    }

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    ) {
      return;
    }

    // Optimistic state update for instant UI feedback
    setJudgeItems((prev) => {
      const activeItems = prev[activeContainer] || [];
      const overItems = prev[overContainer] || [];
      const draggedJudge = activeItems.find((j) => j.id === activeId);

      if (!draggedJudge) return prev;

      return {
        ...prev,
        [activeContainer]: activeItems.filter((j) => j.id !== activeId),
        [overContainer]: [...overItems, draggedJudge],
      };
    });

    // Update database in the background
    const judgeRef = doc(db, getCollectionPath("judges"), activeId);
    const newFloorId = overContainer === "unassigned" ? "" : overContainer;

    try {
      await updateDoc(judgeRef, { floorId: newFloorId });
      showToast(
        `Moved ${judgeToMove.name} to ${
          newFloorId === ""
            ? "Unassigned"
            : floors.find((f) => f.id === newFloorId)?.name
        }.`,
        "success",
      );
    } catch (error) {
      showToast("Error moving judge. Reverting.", "error");
      console.error("Failed to update judge floor:", error);
      // Revert state on failure
      setJudgeItems((prev) => {
        const activeItems = prev[overContainer] || [];
        const overItems = prev[activeContainer] || [];
        const draggedJudge = activeItems.find((j) => j.id === activeId);

        if (!draggedJudge) return prev;

        return {
          ...prev,
          [overContainer]: activeItems.filter((j) => j.id !== activeId),
          [activeContainer]: [...overItems, draggedJudge],
        };
      });
    }
  };

  const findContainer = (id: string): string | undefined => {
    if (judgeItems[id]) {
      return id; // ID is a container (e.g., "unassigned" or a floor ID)
    }
    // ID is an item, find its container
    return Object.keys(judgeItems).find((key) =>
      judgeItems[key].some((item) => item.id === id),
    );
  };

  const handleAutoDistribute = async () => {
    if (!user || !currentEvent) return;
    const judgesToDistribute = judgeItems.unassigned || [];
    if (judgesToDistribute.length === 0 || floors.length === 0) {
      showToast("No unassigned judges or no floors to distribute to.", "info");
      return;
    }

    try {
      const batch = writeBatch(db);
      const newJudgeItems = { ...judgeItems };
      newJudgeItems.unassigned = [];

      judgesToDistribute.forEach((judge, index) => {
        // Only distribute if they don't have an active assignment
        if (!judge.currentAssignmentId) {
          const targetFloor = sortedFloors[index % sortedFloors.length];
          const judgeRef = doc(db, getCollectionPath("judges"), judge.id);
          batch.update(judgeRef, { floorId: targetFloor.id });

          // Optimistic update
          newJudgeItems[targetFloor.id] = [
            ...(newJudgeItems[targetFloor.id] || []),
            judge,
          ];
        } else {
          // Keep them in the unassigned list
          newJudgeItems.unassigned.push(judge);
        }
      });

      setJudgeItems(newJudgeItems); // Set new state
      await batch.commit(); // Commit to DB
      showToast(
        `${
          judgesToDistribute.length - newJudgeItems.unassigned.length
        } judges distributed successfully!`,
        "success",
      );
      if (newJudgeItems.unassigned.length > 0) {
        showToast(
          `${newJudgeItems.unassigned.length} judges left unassigned (active assignment).`,
          "info",
        );
      }
    } catch (error) {
      showToast("Failed to auto-distribute judges.", "error");
      console.error("Auto-distribution error:", error);
      // Note: Reverting this optimistic update is complex;
      // we'll rely on the snapshot listener to eventually correct the state on error.
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        className="flex flex-col gap-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <MotionCard>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-zinc-100">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
                  1
                </span>
                <Building2 className="size-5" /> Manage Floors
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddFloor();
                }}
                className="space-y-3"
              >
                <Input
                  type="text"
                  placeholder="Floor Name (e.g., Floor 1)"
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                />
                <div className="flex gap-3">
                  <Input
                    type="number"
                    placeholder="Start Team #"
                    value={teamStart}
                    onChange={(e) => setTeamStart(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="End Team #"
                    value={teamEnd}
                    onChange={(e) => setTeamEnd(e.target.value)}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-br from-orange-500 to-orange-600 transition-all duration-150 hover:from-orange-600 hover:to-orange-700"
                >
                  <PlusCircle className="h-4 w-4" /> Add Floor
                </Button>
              </form>
            </div>
            <Card className="max-h-64 overflow-y-auto rounded-lg bg-zinc-900/50 p-3">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-zinc-900/50 backdrop-blur-sm">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold text-zinc-400">
                      Floor
                    </th>
                    <th className="px-2 py-2 text-left font-semibold text-zinc-400">
                      Team Range
                    </th>
                    <th className="w-10 px-2 py-2 text-right font-semibold text-zinc-400"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFloors.map((floor) => (
                    <tr key={floor.id} className="border-t border-zinc-800">
                      <td className="px-2 py-2 font-medium">{floor.name}</td>
                      <td className="px-2 py-2 text-zinc-400">
                        {floor.teamNumberStart} - {floor.teamNumberEnd}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <Tooltip content={`Delete ${floor.name}`}>
                          <button
                            onClick={() =>
                              handleDeleteFloor(floor.id, floor.name)
                            }
                            className="text-rose-500/70 transition-colors hover:text-rose-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </MotionCard>

        <MotionCard>
          <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-zinc-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
              2
            </span>
            <Users className="size-5" /> Manage & Assign Judges
          </h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* --- ADD JUDGES / ROSTER COLUMN --- */}
            <div className="flex h-full flex-col gap-4 lg:col-span-1">
              <Card>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddJudges();
                  }}
                  className="space-y-3"
                >
                  <textarea
                    value={judgeInput}
                    onChange={(e) => setJudgeInput(e.target.value)}
                    placeholder="One judge name per line..."
                    rows={5}
                    className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-200 placeholder-zinc-500 shadow-inner shadow-black/40 transition-colors outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/50"
                  />
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-br from-orange-500 to-orange-600 transition-all duration-150 hover:from-orange-600 hover:to-orange-700"
                  >
                    <PlusCircle className="h-4 w-4" /> Add Judges
                  </Button>
                </form>
              </Card>

              <Card className="flex h-full max-h-102.5 flex-col">
                <h3 className="mb-3 border-b border-zinc-700 px-3 pb-3 font-semibold text-zinc-100">
                  Judge Roster ({judges.length})
                </h3>
                <div className="custom-scrollbar h-full space-y-2 overflow-y-auto pb-3">
                  {[...judges]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((judge) => {
                      const isBusy = !!judge.currentAssignmentId;
                      const hasHistory = judge.completedAssignments > 0;
                      // [FIX] 'isLocked' for deletion check remains the same
                      const isLocked = isBusy || hasHistory;
                      const floorName = judge.floorId
                        ? floorMap.get(judge.floorId)
                        : "Unassigned";

                      let StatusIcon, statusColor, statusTooltip;
                      if (isBusy) {
                        StatusIcon = Clock; // Active assignment
                        statusColor = "text-amber-400";
                        statusTooltip = "Busy (Active Assignment)";
                      } else if (hasHistory) {
                        StatusIcon = History; // Completed assignments, but not busy
                        statusColor = "text-emerald-400"; // Available (green)
                        statusTooltip = "Available (has history)";
                      } else {
                        StatusIcon = User; // No active, no completed
                        statusColor = "text-emerald-400";
                        statusTooltip = "Available";
                      }

                      return (
                        <div
                          key={judge.id}
                          className="flex items-center justify-between rounded-lg bg-zinc-800/70 px-3 py-2 pr-4 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Tooltip content={statusTooltip} position="right">
                              <StatusIcon
                                className={`size-4 flex-shrink-0 ${statusColor}`}
                              />
                            </Tooltip>
                            <div className="min-w-0">
                              <p
                                className="truncate font-semibold text-zinc-100"
                                title={judge.name}
                              >
                                {judge.name}
                              </p>
                              <p className="truncate text-xs text-zinc-400">
                                {floorName}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-shrink-0 items-center gap-2 pl-2">
                            {hasHistory && (
                              <Tooltip
                                content="Completed Assignments"
                                position="left"
                              >
                                <div className="flex items-center gap-1 text-xs text-emerald-400">
                                  <History className="size-3" />
                                  {judge.completedAssignments}
                                </div>
                              </Tooltip>
                            )}
                            {/* Deletion logic remains locked if judge has history */}
                            {!isLocked && (
                              <Tooltip content="Delete Judge" position="left">
                                <button
                                  onClick={() =>
                                    handleDeleteJudge(judge.id, judge.name)
                                  }
                                  className="cursor-pointer text-rose-500/60 transition-colors hover:text-rose-500"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </Card>
              {/* --- END NEW CARD --- */}
            </div>

            {/* --- ASSIGNMENT AREA --- */}
            <div className="flex h-full flex-col gap-4 lg:col-span-2">
              {/* --- AUTO-DISTRIBUTE CARD --- */}
              <Card className="flex flex-col items-start gap-4 bg-zinc-900/50 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                    <Sparkles className="size-5 text-orange-400" />
                    Auto-Distribute
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Evenly distribute all{" "}
                    <strong>{unassignedJudges.length}</strong> unassigned judges
                    among the <strong>{floors.length}</strong> floors.
                  </p>
                </div>
                <Button
                  onClick={handleAutoDistribute}
                  disabled={
                    unassignedJudges.length === 0 || floors.length === 0
                  }
                  size="md"
                  className="w-full flex-shrink-0 bg-gradient-to-br from-orange-500 to-orange-600 text-sm transition-all duration-150 hover:from-orange-600 hover:to-orange-700 md:w-auto"
                >
                  <Sparkles className="size-4" /> Distribute Judges
                </Button>
              </Card>

              {/* --- DND ZONES --- */}
              <div
                className={`flex h-full flex-col ${floors.length === 0 ? "" : "gap-4"}`}
              >
                <DroppableZone
                  id="unassigned"
                  title={`Unassigned (${unassignedJudges.length})`}
                  items={unassignedJudges}
                  onDeleteJudge={handleDeleteJudge}
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {sortedFloors.map((floor) => (
                    <DroppableZone
                      key={floor.id}
                      id={floor.id}
                      title={`${floor.name} (${(judgeItems[floor.id] || []).length})`}
                      items={judgeItems[floor.id] || []}
                      onDeleteJudge={handleDeleteJudge}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </MotionCard>
      </motion.div>
      <DragOverlay>
        {activeDragItem ? (
          <DraggableJudgeOverlay judge={activeDragItem} />
        ) : null}
      </DragOverlay>

      {/* --- CONFIRMATION DIALOG --- */}
      <ConfirmationDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmDelete}
        title={`Delete ${deletionArgs?.type === "floor" ? "Floor" : "Judge"}`}
        icon={<Trash2 className="size-6 text-rose-500" />}
      >
        <p>
          Are you sure you want to delete <strong>{deletionArgs?.name}</strong>?
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          This action cannot be undone.
        </p>
      </ConfirmationDialog>
    </DndContext>
  );
};

export default AdminPanel;
