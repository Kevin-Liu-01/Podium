import React, { useState, useEffect, useMemo } from "react";
import { doc, deleteDoc, writeBatch, collection } from "firebase/firestore";
import { PlusCircle, Trash2, Search } from "lucide-react";
import { motion } from "framer-motion";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { InputMode } from "../../lib/types";
import { staggerContainer, fadeInUp } from "../../lib/animations";
import MotionCard from "../ui/MotionCard";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ToggleButton } from "../ui/ToggleButton";
import { CustomDropdown } from "../ui/CustomDropdown";

const AddDataForm = ({
  type,
  mode,
  onModeChange,
  floorId,
  onFloorChange,
}: {
  type: "judge" | "floor" | "room";
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  floorId?: string;
  onFloorChange?: (id: string) => void;
}) => {
  const { judges, floors, rooms, currentEvent, showToast } = useAppContext();
  const [input, setInput] = useState("");
  const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1);
  const getCollectionPath = (col: string) =>
    `events/${currentEvent!.id}/${col}`;

  const handleAdd = async () => {
    const names = input
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return showToast("Input is empty.", "info");

    const batch = writeBatch(db);
    let addedCount = 0;
    const existingMap =
      type === "judge"
        ? new Map(judges.map((j) => [j.name.toLowerCase(), true]))
        : type === "floor"
          ? new Map(floors.map((f) => [f.name.toLowerCase(), true]))
          : new Map(rooms.map((r) => [r.number.toLowerCase(), true]));

    for (const name of names) {
      if (existingMap.has(name.toLowerCase())) {
        showToast(
          `${typeCapitalized} "${name}" already exists. Skipping.`,
          "info",
        );
        continue;
      }
      const newRef = doc(collection(db, getCollectionPath(`${type}s`)));
      let data: any;
      if (type === "judge") data = { name, completedAssignments: 0 };
      else if (type === "floor")
        data = { name, index: floors.length + addedCount };
      else if (type === "room") {
        if (!floorId)
          return showToast("Select a floor for new rooms.", "error");
        data = { number: name, floorId: floorId };
      }
      batch.set(newRef, data);
      addedCount++;
    }
    await batch.commit();
    showToast(`${addedCount} ${type}(s) added successfully!`, "success");
    setInput("");
  };

  return (
    <MotionCard>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-100">
          <PlusCircle className="h-5 w-5 text-orange-500" /> Add{" "}
          {typeCapitalized}s
        </h2>
        <div className="w-32">
          <ToggleButton
            left="Single"
            right="Bulk"
            value={mode}
            onChange={onModeChange}
          />
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd();
        }}
        className="mt-3 space-y-3"
      >
        <div className={type === "room" ? "flex items-start gap-3" : ""}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === "single"
                ? `${typeCapitalized} Name/Number`
                : `One ${type} name per line...`
            }
            rows={mode === "single" ? 1 : 3}
            className={`w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 focus:outline-none ${type === "room" ? "flex-grow" : ""}`}
          />
          {type === "room" && (
            <div className="w-2/5">
              <CustomDropdown
                value={floorId || ""}
                onChange={onFloorChange!}
                options={floors.map((f) => ({ value: f.id, label: f.name }))}
                placeholder="Select Floor"
              />
            </div>
          )}
        </div>
        <Button type="submit" className="w-full">
          Add {typeCapitalized}
          {mode === "bulk" ? "s" : ""}
        </Button>
      </form>
    </MotionCard>
  );
};

const SearchableListCard = ({
  title,
  items,
  renderItem,
  onDelete,
}: {
  title: string;
  items: any[];
  renderItem: (item: any) => React.ReactNode;
  onDelete: (id: string, name: string) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) =>
          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.number?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [items, searchTerm],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h3 className="text-base font-bold whitespace-nowrap text-zinc-300">
          {title}{" "}
          <span className="text-sm font-normal">({filteredItems.length})</span>
        </h3>
        <div className="relative w-full max-w-xs">
          <Input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
            <Search className="h-4 w-4" />
          </div>
        </div>
      </div>
      <div className="grid flex-grow grid-cols-2 content-start gap-1.5 overflow-y-auto pr-2 md:grid-cols-2 lg:grid-cols-3">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => renderItem(item))
        ) : (
          <p className="col-span-full p-2 text-xs text-zinc-500 italic">
            No items found.
          </p>
        )}
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const { judges, rooms, floors, currentEvent, showToast } = useAppContext();
  const [roomFloorId, setRoomFloorId] = useState("");
  const [inputModes, setInputModes] = useState<Record<string, InputMode>>({
    judge: "single",
    floor: "single",
    room: "single",
  });

  const getCollectionPath = (col: string) =>
    `events/${currentEvent!.id}/${col}`;

  useEffect(() => {
    if (floors.length > 0 && !roomFloorId) {
      setRoomFloorId(floors[0].id);
    }
  }, [floors, roomFloorId]);

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

  return (
    <motion.div
      className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <div className="space-y-6 lg:col-span-1">
        <AddDataForm
          type="judge"
          mode={inputModes.judge}
          onModeChange={(m) => setInputModes((p) => ({ ...p, judge: m }))}
        />
        <AddDataForm
          type="floor"
          mode={inputModes.floor}
          onModeChange={(m) => setInputModes((p) => ({ ...p, floor: m }))}
        />
        <AddDataForm
          type="room"
          mode={inputModes.room}
          onModeChange={(m) => setInputModes((p) => ({ ...p, room: m }))}
          floorId={roomFloorId}
          onFloorChange={setRoomFloorId}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-2">
        <MotionCard className="h-[400px]">
          <SearchableListCard
            title="Judges"
            items={judges}
            onDelete={(id, name) => handleDelete(id, "judges", name)}
            renderItem={(judge) => (
              <div
                key={judge.id}
                className="flex items-center justify-between rounded-md bg-zinc-800 p-2 text-sm"
              >
                <span className="font-semibold">{judge.name}</span>
                <button
                  onClick={() => handleDelete(judge.id, "judges", judge.name)}
                  className="text-rose-500 opacity-50 transition-opacity hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          />
        </MotionCard>
        <MotionCard className="h-[400px]">
          <SearchableListCard
            title="Floors"
            items={floors}
            onDelete={(id, name) => handleDelete(id, "floors", name)}
            renderItem={(floor) => (
              <div
                key={floor.id}
                className="flex items-center justify-between rounded-md bg-zinc-800 p-2 text-sm"
              >
                <span className="font-semibold">{floor.name}</span>
                <button
                  onClick={() => handleDelete(floor.id, "floors", floor.name)}
                  className="text-rose-500 opacity-50 transition-opacity hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          />
        </MotionCard>
        <MotionCard className="h-[400px] md:col-span-2">
          <SearchableListCard
            title="Rooms"
            items={rooms}
            onDelete={(id, name) => handleDelete(id, "rooms", name)}
            renderItem={(room) => {
              const f = floors.find((fl) => fl.id === room.floorId);
              return (
                <div
                  key={room.id}
                  className="flex items-center justify-between rounded-md bg-zinc-800 p-2 text-sm"
                >
                  <span className="font-semibold">Room {room.number}</span>
                  <div className="flex items-center gap-x-2">
                    <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-300">
                      {f?.name || "Unassigned"}
                    </span>
                    <button
                      onClick={() =>
                        handleDelete(room.id, "rooms", `Room ${room.number}`)
                      }
                      className="text-rose-500 opacity-50 transition-opacity hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            }}
          />
        </MotionCard>
      </div>
    </motion.div>
  );
};

export default AdminPanel;
