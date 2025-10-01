import React, { useState, useEffect, useMemo } from "react";
import { doc, deleteDoc, writeBatch, collection } from "firebase/firestore";
import { PlusCircle, Trash2, Search } from "lucide-react";
import { motion } from "framer-motion";
import { db } from "../../firebase/config";
import { useAppContext } from "../../context/AppContext";
import type { InputMode } from "../../lib/types";
import { staggerContainer, fadeInUp } from "../../lib/animations";
import MotionCard from "../ui/MotionCard";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { ToggleButton } from "../ui/ToggleButton";
import { CustomDropdown } from "../ui/CustomDropdown";

// This component is only used within AdminPanel, so it's co-located here.
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
        data = { number: name, floorId };
      }
      batch.set(newRef, data);
      addedCount++;
    }
    await batch.commit();
    showToast(`${addedCount} ${type}(s) added successfully!`, "success");
    setInput("");
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
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
        className="space-y-3"
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
            rows={mode === "single" ? 1 : 4}
            className={`w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm text-zinc-200 placeholder-zinc-500 shadow-inner shadow-black/40 transition-colors outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/50 ${type === "room" ? "flex-grow" : ""}`}
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
        <Button
          type="submit"
          className="w-full bg-gradient-to-br from-orange-500 to-orange-600 transition-all duration-150 hover:from-orange-600 hover:to-orange-700"
        >
          Add {typeCapitalized}
          {mode === "bulk" ? "s" : ""}
        </Button>
      </form>
    </>
  );
};

// This component is also co-located as it's specific to AdminPanel.
const SearchableListCard = ({
  title,
  items,
  renderItem,
}: {
  title: string;
  items: any[];
  renderItem: (item: any) => React.ReactNode;
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
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold whitespace-nowrap text-zinc-100">
          {title}{" "}
          <span className="text-sm font-normal text-zinc-400">
            ({filteredItems.length})
          </span>
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
      <div className="flex-grow space-y-2 overflow-y-auto pr-1">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => renderItem(item))
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-zinc-500 italic">No items found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Main component export
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
      <div className="flex flex-col gap-6 lg:col-span-1">
        <MotionCard>
          <AddDataForm
            type="judge"
            mode={inputModes.judge}
            onModeChange={(m) => setInputModes((p) => ({ ...p, judge: m }))}
          />
        </MotionCard>
        <MotionCard>
          <AddDataForm
            type="floor"
            mode={inputModes.floor}
            onModeChange={(m) => setInputModes((p) => ({ ...p, floor: m }))}
          />
        </MotionCard>
        <MotionCard>
          <AddDataForm
            type="room"
            mode={inputModes.room}
            onModeChange={(m) => setInputModes((p) => ({ ...p, room: m }))}
            floorId={roomFloorId}
            onFloorChange={setRoomFloorId}
          />
        </MotionCard>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:col-span-2">
        <MotionCard className="h-[450px]">
          <SearchableListCard
            title="Judges"
            items={judges}
            renderItem={(judge) => (
              <div
                key={judge.id}
                className="flex items-center justify-between rounded-lg bg-black/20 p-2 text-sm shadow-inner shadow-white/5 transition-colors hover:bg-white/5"
              >
                <span className="font-semibold">{judge.name}</span>
                <button
                  onClick={() => handleDelete(judge.id, "judges", judge.name)}
                  className="text-rose-500/70 transition-colors hover:text-rose-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          />
        </MotionCard>
        <MotionCard className="h-[450px] md:col-span-2">
          <SearchableListCard
            title="Rooms & Floors"
            items={[...floors, ...rooms]}
            renderItem={(item) => {
              // Check if the item is a floor or a room
              if (item.index !== undefined) {
                // It's a Floor
                return (
                  <div
                    key={item.id}
                    className="col-span-full flex items-center justify-between rounded-lg bg-amber-900/40 p-2 text-sm font-bold text-amber-300"
                  >
                    <span>{item.name}</span>
                    <button
                      onClick={() => handleDelete(item.id, "floors", item.name)}
                      className="text-rose-500/70 transition-colors hover:text-rose-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              }
              // It's a Room
              const floor = floors.find((f) => f.id === item.floorId);
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-black/20 p-2 text-sm shadow-inner shadow-white/5 transition-colors hover:bg-white/5"
                >
                  <span className="font-semibold">Room {item.number}</span>
                  <div className="flex items-center gap-x-2">
                    <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs font-medium text-zinc-300">
                      {floor?.name || "Unassigned"}
                    </span>
                    <button
                      onClick={() =>
                        handleDelete(item.id, "rooms", `Room ${item.number}`)
                      }
                      className="text-rose-500/70 transition-colors hover:text-rose-500"
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
