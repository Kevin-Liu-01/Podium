import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { updateDoc, doc, writeBatch, collection } from "firebase/firestore";
import { PlusCircle, SlidersHorizontal } from "lucide-react";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { Project, InputMode } from "../../lib/types";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { ToggleButton } from "../ui/ToggleButton";
import DroppableColumn from "../dnd/DroppableColumn";
import DraggableProject from "../dnd/DraggableProject";

const ProjectSetup = () => {
  const { projects, rooms, floors, currentEvent, showToast } = useAppContext();
  const [projectItems, setProjectItems] = useState<Record<string, Project[]>>({
    unassigned: [],
  });
  const [activeFloorId, setActiveFloorId] = useState<string>("");
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<InputMode>("bulk");
  const [activeDragItem, setActiveDragItem] = useState<Project | null>(null);
  const [isDistributing, setIsDistributing] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    if (floors.length > 0 && !activeFloorId) {
      setActiveFloorId(floors[0].id);
    }
  }, [floors, activeFloorId]);

  useEffect(() => {
    const unassigned = projects.filter((p) => !p.roomId);
    const groupedByRoom = Object.fromEntries(
      rooms.map((r) => [r.id, projects.filter((p) => p.roomId === r.id)]),
    );
    setProjectItems({ unassigned, ...groupedByRoom });
  }, [projects, rooms]);

  const handleAddProjects = async () => {
    const names = input
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return showToast("Input is empty.", "info");

    const batch = writeBatch(db);
    let addedCount = 0;
    for (const name of names) {
      if (projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
        showToast(`Project "${name}" already exists.`, "info");
        continue;
      }
      const newProjectRef = doc(
        collection(db, `events/${currentEvent!.id}/projects`),
      );
      batch.set(newProjectRef, {
        name,
        roomId: "",
        floorId: "",
        reviewedBy: [],
        totalScore: 0,
        averageScore: 0,
      });
      addedCount++;
    }
    await batch.commit();
    showToast(`${addedCount} project(s) added.`, "success");
    setInput("");
  };

  const handleAutoDistribute = async () => {
    const unassignedProjects = projectItems.unassigned || [];
    if (unassignedProjects.length === 0)
      return showToast("No unassigned projects to distribute.", "info");
    if (rooms.length === 0)
      return showToast(
        "No rooms available to distribute projects to.",
        "error",
      );

    setIsDistributing(true);
    try {
      const batch = writeBatch(db);
      const shuffledProjects = [...unassignedProjects].sort(
        () => Math.random() - 0.5,
      );

      shuffledProjects.forEach((project, index) => {
        const roomIndex = index % rooms.length;
        const assignedRoom = rooms[roomIndex];
        const projectRef = doc(
          db,
          `events/${currentEvent!.id}/projects`,
          project.id,
        );
        batch.update(projectRef, {
          roomId: assignedRoom.id,
          floorId: assignedRoom.floorId,
        });
      });

      await batch.commit();
      showToast(
        `Successfully distributed ${shuffledProjects.length} projects.`,
        "success",
      );
    } catch (error) {
      console.error("Failed to auto-distribute projects:", error);
      showToast("An error occurred during distribution.", "error");
    } finally {
      setIsDistributing(false);
    }
  };

  const findContainer = (id: string) => {
    if (id === "unassigned" || rooms.some((r) => r.id === id)) return id;
    return Object.keys(projectItems).find((key) =>
      projectItems[key]?.some((p) => p.id === id),
    );
  };

  const handleDragStart = (event: any) => {
    const { active } = event;
    setActiveDragItem(projects.find((p) => p.id === active.id) || null);
  };

  const handleDragEnd = async (event: any) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const oldContainerId = findContainer(active.id);
    const newContainerId = findContainer(over.id);

    if (!oldContainerId || !newContainerId || oldContainerId === newContainerId)
      return;

    // Optimistic UI update
    const movedItem = projectItems[oldContainerId]?.find(
      (p) => p.id === active.id,
    );
    if (!movedItem) return;
    setProjectItems((prev) => {
      const newItems = { ...prev };
      newItems[oldContainerId] =
        newItems[oldContainerId]?.filter((p) => p.id !== active.id) || [];
      newItems[newContainerId] = [
        ...(newItems[newContainerId] || []),
        movedItem,
      ];
      return newItems;
    });

    try {
      const projectRef = doc(
        db,
        `events/${currentEvent!.id}/projects`,
        active.id,
      );
      const newRoomId = newContainerId === "unassigned" ? "" : newContainerId;
      const room = rooms.find((r) => r.id === newRoomId);
      await updateDoc(projectRef, {
        roomId: newRoomId,
        floorId: room?.floorId || "",
      });
      showToast(`Project "${movedItem.name}" moved successfully.`, "success");
    } catch (error) {
      showToast("Error moving project. Reverting changes.", "error");
      console.error("Failed to update project room:", error);
      // Revert UI on error
      setProjectItems((prev) => {
        const revertedItems = { ...prev };
        revertedItems[newContainerId] =
          revertedItems[newContainerId]?.filter((p) => p.id !== active.id) ||
          [];
        revertedItems[oldContainerId] = [
          ...(revertedItems[oldContainerId] || []),
          movedItem,
        ];
        return revertedItems;
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-100">
                <PlusCircle className="h-5 w-5 text-orange-500" /> Add Projects
              </h2>
              <div className="w-32">
                <ToggleButton
                  left="Single"
                  right="Bulk"
                  value={mode}
                  onChange={setMode}
                />
              </div>
            </div>
            <div className="mt-3 space-y-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  mode === "single"
                    ? "Project Name"
                    : "One project name per line..."
                }
                rows={mode === "single" ? 1 : 5}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm"
              />
              <Button onClick={handleAddProjects} className="w-full">
                Add to Unassigned
              </Button>
              <Button
                onClick={handleAutoDistribute}
                disabled={
                  isDistributing || (projectItems.unassigned || []).length === 0
                }
                className="w-full bg-indigo-600 hover:bg-indigo-500"
              >
                <SlidersHorizontal className="size-4" />
                {isDistributing
                  ? "Distributing..."
                  : `Auto-Distribute ${(projectItems.unassigned || []).length} Projects`}
              </Button>
            </div>
          </Card>
          <div className="h-full flex-grow">
            <DroppableColumn
              id="unassigned"
              title={`Unassigned Projects (${(projectItems.unassigned || []).length})`}
              projects={projectItems.unassigned || []}
            />
          </div>
        </div>
        <div className="h-full lg:col-span-3">
          <div className="mb-4 flex items-center gap-2 border-b border-zinc-800">
            {floors.map((floor) => (
              <button
                key={floor.id}
                onClick={() => setActiveFloorId(floor.id)}
                className={`px-4 py-2 text-sm font-semibold ${activeFloorId === floor.id ? "border-b-2 border-orange-500 text-orange-500" : "text-zinc-400 hover:text-white"}`}
              >
                {floor.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2 lg:grid-cols-3">
            {rooms
              .filter((r) => r.floorId === activeFloorId)
              .map((room) => (
                <DroppableColumn
                  key={room.id}
                  id={room.id}
                  title={`Room ${room.number}`}
                  projects={projectItems[room.id] || []}
                  isRoom={true}
                />
              ))}
          </div>
        </div>
        <DragOverlay>
          {activeDragItem ? (
            <DraggableProject project={activeDragItem} />
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default ProjectSetup;
