import React, { useState } from "react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { PlusCircle, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { db } from "../../firebase/config";
import type { Event } from "../../lib/types";
import { useAppContext } from "../../context/AppContext";
import { staggerContainer } from "../../lib/animations";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import EventCard from "./EventCard";
import ConfirmationDialog from "../ui/ConfirmationDialog";

// A glowing, animated skeleton card for a more dynamic loading state.
const EventCardSkeleton = () => (
  <div className="flex h-[150px] flex-col justify-between rounded-xl border border-white/10 bg-zinc-900/50 p-5 shadow-lg backdrop-blur-md">
    <div className="mb-2 h-6 w-3/4 animate-pulse rounded-full bg-zinc-800/60"></div>
    <div className="h-4 w-1/4 animate-pulse rounded-full bg-zinc-800/60"></div>
    <div className="mt-4 flex justify-around">
      <div className="h-5 w-8 animate-pulse rounded-full bg-zinc-800/60"></div>
      <div className="h-5 w-8 animate-pulse rounded-full bg-zinc-800/60"></div>
      <div className="h-5 w-8 animate-pulse rounded-full bg-zinc-800/60"></div>
    </div>
  </div>
);

const EventSetupPanel = () => {
  const { events, setCurrentEventId, showToast, isLoading } = useAppContext();
  const [eventName, setEventName] = useState("");
  const [eventYear, setEventYear] = useState(new Date().getFullYear());
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  /**
   * Generates a URL-friendly slug from the event name and appends the year.
   * Example: "Hack Princeton" + 2025 -> "hack-princeton-2025"
   */
  const generateEventId = (name: string, year: number): string => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-"); // Replace spaces with hyphens
    return `${slug}-${year}`;
  };

  const createEvent = async () => {
    if (!eventName.trim()) {
      return showToast("Event name cannot be empty.", "error");
    }

    const eventId = generateEventId(eventName, eventYear);
    const eventFullName = `${eventName.trim()} ${eventYear}`;

    if (events.some((e) => e.id === eventId)) {
      return showToast(`Event "${eventFullName}" already exists.`, "error");
    }

    const newEvent: Event = { id: eventId, name: eventFullName };
    await setDoc(doc(db, "events", newEvent.id), newEvent);

    showToast(`Event "${newEvent.name}" created!`, "success");
    setCurrentEventId(newEvent.id);
    setEventName("");
  };

  const handleDeleteRequest = (event: Event) => {
    setEventToDelete(event);
    setConfirmOpen(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;

    try {
      await deleteDoc(doc(db, "events", eventToDelete.id));
      showToast(`Event "${eventToDelete.name}" was deleted.`, "success");
      // Note: Deleting a document does NOT delete its subcollections.
      // For a full cleanup (teams, judges, etc.), a Firebase Cloud Function
      // triggered on document delete is the recommended approach.
    } catch (error) {
      console.error("Failed to delete event:", error);
      showToast("Could not delete the event.", "error");
    } finally {
      setConfirmOpen(false);
      setEventToDelete(null);
    }
  };

  const MIN_CARDS = 8;
  const skeletonCount = Math.max(0, MIN_CARDS - (events.length + 1));

  return (
    <>
      <div className="fixed inset-0 -z-20 h-full w-full bg-zinc-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
      <div className="space-y-12">
        <div className="mt-4 text-center">
          <h1 className="bg-gradient-to-br from-white via-zinc-300 to-zinc-500 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-6xl">
            Event Control Deck
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
            Launch a new mission or manage an existing hackathon event.
          </p>
        </div>

        <motion.div
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* --- Create Event Card --- */}
          <Card className="border-2 border-orange-500/80 shadow-2xl shadow-orange-500/20">
            <h2 className="mb-4 text-center text-xl font-bold text-slate-100">
              Launch New Event
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createEvent();
              }}
              className="space-y-4"
            >
              <Input
                type="text"
                placeholder="Event Name (e.g., HackPrinceton)"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                required
              />
              <Input
                type="number"
                placeholder="Year"
                value={eventYear}
                onChange={(e) =>
                  setEventYear(
                    parseInt(e.target.value) || new Date().getFullYear(),
                  )
                }
                required
              />
              <Button type="submit" className="w-full">
                <PlusCircle className="h-4 w-4" /> Create Event
              </Button>
            </form>
          </Card>

          {/* --- Event Cards & Skeletons --- */}
          {isLoading
            ? Array.from({ length: MIN_CARDS - 1 }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))
            : events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onDelete={() => handleDeleteRequest(event)}
                />
              ))}
          {!isLoading &&
            Array.from({ length: skeletonCount }).map((_, i) => (
              <EventCardSkeleton key={`skel-${i}`} />
            ))}
        </motion.div>
      </div>

      {/* --- Confirmation Dialog --- */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDeleteEvent}
        title="Confirm Event Deletion"
        icon={<ShieldAlert className="size-6 text-red-500" />}
      >
        <p>
          Are you sure you want to permanently delete the event
          <strong className="text-red-400"> "{eventToDelete?.name}"</strong>?
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          This action is irreversible and will remove the event document.
          Sub-collections like teams and judges will require manual cleanup or a
          Cloud Function.
        </p>
      </ConfirmationDialog>
    </>
  );
};

export default EventSetupPanel;
