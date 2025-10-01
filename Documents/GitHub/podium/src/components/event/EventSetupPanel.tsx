import React, { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { PlusCircle } from "lucide-react";
import { motion } from "framer-motion";
import { db } from "../../firebase/config";
import type { Event } from "../../lib/types";
import { useAppContext } from "../../context/AppContext";
import { staggerContainer } from "../../lib/animations";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import EventCard from "./EventCard";

const EventCardSkeleton = () => (
  <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 shadow-lg backdrop-blur-md">
    <div className="mb-2 h-6 w-3/4 rounded-full bg-zinc-800/50"></div>
    <div className="h-4 w-1/4 rounded-full bg-zinc-800/50"></div>
    <div className="mt-4 flex justify-between">
      <div className="h-5 w-8 rounded-full bg-zinc-800/50"></div>
      <div className="h-5 w-8 rounded-full bg-zinc-800/50"></div>
      <div className="h-5 w-8 rounded-full bg-zinc-800/50"></div>
    </div>
  </div>
);

const EventSetupPanel = () => {
  const { events, setCurrentEventId, showToast, isLoading } = useAppContext();
  const [eventName, setEventName] = useState("");
  const [eventYear, setEventYear] = useState(new Date().getFullYear());

  const createEvent = async () => {
    if (!eventName.trim())
      return showToast("Event name cannot be empty.", "error");

    const eventId = eventYear.toString();
    if (events.some((e) => e.id === eventId))
      return showToast(`An event for ${eventYear} already exists.`, "error");

    const newEvent: Omit<Event, "id"> & { id: string } = {
      id: eventId,
      name: `${eventName.trim()} ${eventYear}`,
    };
    await setDoc(doc(db, "events", newEvent.id), newEvent);
    showToast(`Event "${newEvent.name}" created!`, "success");
    setCurrentEventId(newEvent.id);
    setEventName("");
  };

  const MIN_CARDS = 8;
  const skeletonCount = Math.max(0, MIN_CARDS - (events.length + 1));

  return (
    <div className="space-y-12">
      <div className="mt-4 text-center">
        <h1 className="bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
          Hackathon Events
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          Select an event to manage or create a new one.
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <Card className="border-2 border-orange-500/80 shadow-2xl shadow-orange-500/10">
          <h2 className="mb-4 text-center text-xl font-bold text-slate-100">
            Create New Event
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
              placeholder="Event Year"
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

        {isLoading ? (
          Array.from({ length: MIN_CARDS - 1 }).map((_, i) => (
            <EventCardSkeleton key={i} />
          ))
        ) : (
          <>
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <EventCardSkeleton key={`skel-${i}`} />
            ))}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default EventSetupPanel;
