"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { AppContext } from "../../context/AppContext";
import type {
  AppContextType,
  Event,
  Judge,
  Room,
  Project,
  Assignment,
  Floor,
  Page,
  Toast,
  ToastType,
} from "../../lib/types";
import Navbar from "./Navbar";
import ToastContainer from "../toast/ToastContainer";

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [page, setPage] = useState<Page>("admin");
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    setIsLoading(true);
    const unsubEvents = onSnapshot(collection(db, "events"), (snapshot) => {
      const fetchedEvents = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }) as Event)
        .sort((a, b) => parseInt(b.id) - parseInt(a.id));
      setEvents(fetchedEvents);
      setIsLoading(false);
    });
    return () => unsubEvents();
  }, []);

  useEffect(() => {
    if (!currentEventId) {
      setJudges([]);
      setRooms([]);
      setProjects([]);
      setAssignments([]);
      setFloors([]);
      setPage("admin");
      return;
    }
    setIsLoading(true);
    const collections = {
      judges: `events/${currentEventId}/judges`,
      rooms: `events/${currentEventId}/rooms`,
      projects: `events/${currentEventId}/projects`,
      assignments: `events/${currentEventId}/assignments`,
      floors: `events/${currentEventId}/floors`,
    };
    const unsubs = [
      onSnapshot(collection(db, collections.judges), (s) =>
        setJudges(
          s.docs
            .map((d) => ({ ...d.data(), id: d.id }) as Judge)
            .sort((a, b) => a.name.localeCompare(b.name)),
        ),
      ),
      onSnapshot(collection(db, collections.rooms), (s) =>
        setRooms(
          s.docs
            .map((d) => ({ ...d.data(), id: d.id }) as Room)
            .sort((a, b) => a.number.localeCompare(b.number)),
        ),
      ),
      onSnapshot(collection(db, collections.projects), (s) =>
        setProjects(s.docs.map((d) => ({ ...d.data(), id: d.id }) as Project)),
      ),
      onSnapshot(collection(db, collections.assignments), (s) =>
        setAssignments(
          s.docs.map((d) => ({ ...d.data(), id: d.id }) as Assignment),
        ),
      ),
      onSnapshot(collection(db, collections.floors), (s) => {
        setFloors(
          s.docs
            .map((d) => ({ ...d.data(), id: d.id }) as Floor)
            .sort((a, b) => a.index - b.index),
        );
        setIsLoading(false);
      }),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [currentEventId]);

  const currentEvent = useMemo(
    () => events.find((e) => e.id === currentEventId) || null,
    [events, currentEventId],
  );

  const appContextValue: AppContextType = useMemo(
    () => ({
      judges,
      rooms,
      projects,
      assignments,
      floors,
      events,
      page,
      setPage,
      currentEvent,
      setCurrentEventId,
      showToast,
      isLoading,
    }),
    [
      judges,
      rooms,
      projects,
      assignments,
      floors,
      events,
      page,
      currentEvent,
      isLoading,
      showToast,
    ],
  );

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="min-h-screen bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 font-sans text-zinc-200">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <main className="mx-auto max-w-7xl p-4 pt-0 sm:p-6 md:p-8">
          <Navbar />
          <div className="h-full pt-20">{children}</div>
        </main>
      </div>
    </AppContext.Provider>
  );
};
