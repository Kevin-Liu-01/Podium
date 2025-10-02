"use client";
import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { motion } from "framer-motion";
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

// --- Draggable Judge Component ---
const DraggableJudge = React.memo(({ judge }: { judge: Judge }) => {
  return (
    <div className="flex touch-none items-center justify-between rounded-md bg-zinc-700 p-2.5 text-sm shadow-lg ring-2 ring-orange-500">
      <span className="font-semibold text-zinc-100">{judge.name}</span>
      <GripVertical className="size-4 cursor-grab text-zinc-500" />
    </div>
  );
});
DraggableJudge.displayName = "DraggableJudge";

// --- Main Admin Panel ---
const AdminPanel = () => {
  const { judges, floors, currentEvent, showToast } = useAppContext();

  // State for adding entities
  const [judgeInput, setJudgeInput] = useState("");
  const [floorName, setFloorName] = useState("");
  const [teamStart, setTeamStart] = useState("");
  const [teamEnd, setTeamEnd] = useState("");

  // State for DnD
  const [judgeItems, setJudgeItems] = useState<Record<string, Judge[]>>({
    unassigned: [],
  });
  const [activeDragItem, setActiveDragItem] = useState<Judge | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    const unassigned = judges.filter((j) => !j.floorId);
    const groupedByFloor = Object.fromEntries(
      floors.map((f) => [f.id, judges.filter((j) => j.floorId === f.id)]),
    );
    setJudgeItems({ unassigned, ...groupedByFloor });
  }, [judges, floors]);

  const getCollectionPath = (col: string) =>
    `events/${currentEvent!.id}/${col}`;

  const handleDelete = async (id: string, col: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${name}"? This cannot be undone.`,
      )
    ) {
      try {
        await deleteDoc(doc(db, getCollectionPath(col), id));
        showToast(`"${name}" deleted successfully.`, "success");
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
      // Initialize with floorId and the new hasSwitchedFloors property
      batch.set(newRef, {
        name,
        completedAssignments: 0,
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
    const start = parseInt(teamStart),
      end = parseInt(teamEnd);
    if (isNaN(start) || isNaN(end) || start <= 0 || end < start)
      return showToast("Invalid team number range.", "error");
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

  // --- DRAG AND DROP LOGIC (FIXED) ---
  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the container ID for both the dragged item and the drop target.
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (
      !activeContainer ||
      !overContainer ||
      activeContainer === overContainer
    ) {
      return; // No move necessary
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

  // This helper function correctly identifies the container of a dragged/dropped item.
  const findContainer = (id: string): string | undefined => {
    if (judgeItems[id]) {
      return id; // It's a container ID already
    }
    return Object.keys(judgeItems).find((key) =>
      judgeItems[key].some((item) => item.id === id),
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        className="flex flex-col gap-8"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* --- STEP 1: MANAGE FLOORS --- */}
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
                  {floors.map((floor) => (
                    <tr key={floor.id} className="border-t border-zinc-800">
                      <td className="px-2 py-2 font-medium">{floor.name}</td>
                      <td className="px-2 py-2 text-zinc-400">
                        {floor.teamNumberStart} - {floor.teamNumberEnd}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          onClick={() =>
                            handleDelete(floor.id, "floors", floor.name)
                          }
                          className="text-rose-500/70 transition-colors hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </MotionCard>

        {/* --- STEP 2: MANAGE & ASSIGN JUDGES --- */}
        <MotionCard>
          <h2 className="mb-4 flex items-center gap-3 text-xl font-bold text-zinc-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
              2
            </span>
            <Users className="size-5" /> Manage & Assign Judges
          </h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <h3 className="mb-2 font-semibold text-zinc-300">
                Add New Judges
              </h3>
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
                  rows={8}
                  className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-200 placeholder-zinc-500 shadow-inner shadow-black/40 transition-colors outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/50"
                />
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-br from-orange-500 to-orange-600 transition-all duration-150 hover:from-orange-600 hover:to-orange-700"
                >
                  <PlusCircle className="h-4 w-4" /> Add Judges to Unassigned
                </Button>
              </form>
            </div>
            <div className="lg:col-span-2">
              <h3 className="mb-2 font-semibold text-zinc-300">
                Assign Judges to Floors <ArrowRight className="inline size-4" />
              </h3>
              <div
                className={`grid grid-cols-1 gap-4 ${floors.length >= 1 ? "md:grid-cols-2 md:grid-rows-2" : ""} `}
              >
                <div className="row-span-2 h-full">
                  <DroppableZone
                    id="unassigned"
                    title="Unassigned"
                    items={judgeItems.unassigned || []}
                  />
                </div>
                {floors.map((floor) => (
                  <DroppableZone
                    key={floor.id}
                    id={floor.id}
                    title={floor.name}
                    items={judgeItems[floor.id] || []}
                  />
                ))}
              </div>
            </div>
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
