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
  GripVertical,
  ArrowRight,
  Lock,
  Sparkles,
  MousePointerSquareDashed,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { Judge, Floor } from "../../lib/types";
import { staggerContainer } from "../../lib/animations";
import MotionCard from "../ui/MotionCard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import DroppableZone from "../dnd/DroppableZone";
import { Card } from "../ui/Card";
import Tooltip from "../ui/Tooltip";

const DraggableJudge = React.memo(({ judge }: { judge: Judge }) => {
  const isLocked =
    judge.completedAssignments > 0 || !!judge.currentAssignmentId;

  return (
    <div
      className={`flex touch-none items-center justify-between rounded-md p-2.5 text-sm shadow-lg ${
        isLocked
          ? "cursor-not-allowed bg-zinc-800 ring-2 ring-zinc-600"
          : "bg-zinc-700 ring-2 ring-orange-500"
      }`}
    >
      <div className="flex items-center gap-2">
        {isLocked && <Lock className="size-3.5 text-zinc-500" />}
        <span
          className={`font-semibold ${isLocked ? "text-zinc-500" : "text-zinc-100"}`}
        >
          {judge.name}
        </span>
      </div>
      <GripVertical
        className={`size-4 ${
          isLocked ? "text-zinc-600" : "cursor-grab text-zinc-500"
        }`}
      />
    </div>
  );
});
DraggableJudge.displayName = "DraggableJudge";

const AdminPanel = () => {
  const { judges, floors, currentEvent, showToast } = useAppContext();

  const [judgeInput, setJudgeInput] = useState("");
  const [floorName, setFloorName] = useState("");
  const [teamStart, setTeamStart] = useState("");
  const [teamEnd, setTeamEnd] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<"manual" | "auto">(
    "manual",
  );

  const [judgeItems, setJudgeItems] = useState<Record<string, Judge[]>>({
    unassigned: [],
  });
  const [activeDragItem, setActiveDragItem] = useState<Judge | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const sortedFloors = useMemo(
    () => [...floors].sort((a, b) => a.teamNumberStart - b.teamNumberStart),
    [floors],
  );

  const unassignedJudges = useMemo(
    () => judges.filter((j) => !j.floorId),
    [judges],
  );

  useEffect(() => {
    const groupedByFloor = Object.fromEntries(
      floors.map((f) => [f.id, judges.filter((j) => j.floorId === f.id)]),
    );
    setJudgeItems({ unassigned: unassignedJudges, ...groupedByFloor });
  }, [judges, floors, unassignedJudges]);

  const getCollectionPath = (col: string) =>
    `events/${currentEvent!.id}/${col}`;

  const handleDeleteFloor = async (id: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${name}"? This cannot be undone.`,
      )
    ) {
      try {
        await deleteDoc(doc(db, getCollectionPath("floors"), id));
        showToast(`"${name}" deleted successfully.`, "success");
      } catch (e) {
        showToast(`Failed to delete "${name}".`, "error");
      }
    }
  };

  const handleDeleteJudge = async (id: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete judge "${name}"? This cannot be undone.`,
      )
    ) {
      try {
        await deleteDoc(doc(db, getCollectionPath("judges"), id));
        showToast(`Judge "${name}" deleted successfully.`, "success");
      } catch (e) {
        showToast(`Failed to delete "${name}".`, "error");
      }
    }
  };

  const handleAddJudges = async () => {
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
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const judgeToMove = judges.find((j) => j.id === activeId);

    if (
      judgeToMove &&
      (judgeToMove.completedAssignments > 0 || judgeToMove.currentAssignmentId)
    ) {
      showToast(
        `${judgeToMove.name} cannot be moved while they have assignments.`,
        "warning",
      );
      return;
    }

    const overId = over.id as string;
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    ) {
      return;
    }

    const judgeRef = doc(db, getCollectionPath("judges"), activeId);
    const newFloorId = overContainer === "unassigned" ? "" : overContainer;

    try {
      await updateDoc(judgeRef, { floorId: newFloorId });
      showToast(`Judge moved successfully.`, "success");
    } catch (error) {
      showToast("Error moving judge.", "error");
      console.error("Failed to update judge floor:", error);
    }
  };

  const findContainer = (id: string): string | undefined => {
    if (judgeItems[id]) {
      return id;
    }
    return Object.keys(judgeItems).find((key) =>
      judgeItems[key].some((item) => item.id === id),
    );
  };

  const handleAutoDistribute = async () => {
    if (unassignedJudges.length === 0 || floors.length === 0) {
      showToast("Nothing to distribute.", "info");
      return;
    }

    try {
      const batch = writeBatch(db);
      unassignedJudges.forEach((judge, index) => {
        const targetFloor = floors[index % floors.length];
        const judgeRef = doc(db, getCollectionPath("judges"), judge.id);
        batch.update(judgeRef, { floorId: targetFloor.id });
      });
      await batch.commit();
      showToast(
        `${unassignedJudges.length} judges distributed successfully!`,
        "success",
      );
    } catch (error) {
      showToast("Failed to auto-distribute judges.", "error");
      console.error("Auto-distribution error:", error);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
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

              <Card className="rounded-lg bg-zinc-900/50 p-3">
                <h3 className="mb-2 font-semibold text-zinc-300">
                  All Judges ({judges.length})
                </h3>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-2">
                  {[...judges]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((judge) => {
                      const isLocked =
                        judge.completedAssignments > 0 ||
                        !!judge.currentAssignmentId;
                      return (
                        <div
                          key={judge.id}
                          className="flex items-center justify-between rounded-md bg-zinc-800 p-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Tooltip
                              content={
                                isLocked
                                  ? "This judge has assignments and cannot be deleted or moved."
                                  : "This judge is unassigned and can be moved or deleted."
                              }
                              position="right"
                            >
                              <span
                                className={
                                  isLocked
                                    ? "text-zinc-500"
                                    : "text-emerald-500"
                                }
                              >
                                <Lock
                                  className={`size-4 ${isLocked ? "" : "opacity-50"}`}
                                />
                              </span>
                            </Tooltip>
                            <span
                              className={
                                isLocked ? "text-zinc-500" : "text-zinc-100"
                              }
                            >
                              {judge.name}
                            </span>
                          </div>
                          {!isLocked && (
                            <Tooltip content="Delete Judge" position="left">
                              <button
                                onClick={() =>
                                  handleDeleteJudge(judge.id, judge.name)
                                }
                                className="text-rose-500/60 transition-colors hover:text-rose-500"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      );
                    })}
                </div>
              </Card>
            </div>
            <Card className="h-full lg:col-span-2">
              <div className="mb-4 flex rounded-lg bg-zinc-950/50 p-1">
                <Button
                  onClick={() => setAssignmentMode("manual")}
                  className={`w-1/2 ${assignmentMode === "manual" ? "bg-orange-600" : "bg-transparent"}`}
                  size="sm"
                >
                  <MousePointerSquareDashed className="size-4" /> Manual Drag &
                  Drop
                </Button>
                <Button
                  onClick={() => setAssignmentMode("auto")}
                  className={`w-1/2 ${assignmentMode === "auto" ? "bg-orange-600" : "bg-transparent"}`}
                  size="sm"
                >
                  <Sparkles className="size-4" /> Auto-Distribute
                </Button>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={assignmentMode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-[calc(100%-3.3rem)]"
                >
                  {assignmentMode === "manual" ? (
                    <div
                      className={`grid h-full grid-cols-1 gap-4 ${
                        floors.length >= 1 ? "md:grid-cols-2" : ""
                      } `}
                    >
                      <div
                        className={
                          floors.length >= 1 ? "h-full md:row-span-2" : "h-full"
                        }
                      >
                        <DroppableZone
                          id="unassigned"
                          title={`Unassigned (${unassignedJudges.length})`}
                          items={judgeItems.unassigned || []}
                        />
                      </div>
                      {floors.map((floor) => (
                        <DroppableZone
                          key={floor.id}
                          id={floor.id}
                          title={`${floor.name} (${(judgeItems[floor.id] || []).length})`}
                          items={judgeItems[floor.id] || []}
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="flex h-full flex-col items-center justify-center bg-zinc-900/50 p-8 text-center">
                      <Sparkles className="size-8 text-orange-400" />
                      <h3 className="mt-4 text-lg font-bold text-white">
                        Auto-Distribute Judges
                      </h3>
                      <p className="mt-2 max-w-sm text-sm text-zinc-400">
                        This will evenly distribute all{" "}
                        <strong>{unassignedJudges.length}</strong> unassigned
                        judges among the <strong>{floors.length}</strong>{" "}
                        available floors in a round-robin fashion.
                      </p>
                      <div className="mt-4">
                        <Button
                          onClick={handleAutoDistribute}
                          disabled={
                            unassignedJudges.length === 0 || floors.length === 0
                          }
                          size="md"
                          className="bg-gradient-to-br from-orange-500 to-orange-600 text-sm transition-all duration-150 hover:from-orange-600 hover:to-orange-700"
                        >
                          <Sparkles className="size-4" /> Distribute Unassigned
                          Judges
                        </Button>
                      </div>
                    </Card>
                  )}
                </motion.div>
              </AnimatePresence>
            </Card>
          </div>
        </MotionCard>
      </motion.div>
      <DragOverlay>
        {activeDragItem ? <DraggableJudge judge={activeDragItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default AdminPanel;
