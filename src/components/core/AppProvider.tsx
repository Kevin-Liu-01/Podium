"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { AppContext } from "../../context/AppContext";
import Navbar from "./Navbar";
import ToastContainer from "../toast/ToastContainer";

// --- Type Definitions (Updated) ---
export interface Team {
  id: string;
  name: string;
  number: number;
  floorId: string;
  reviewedBy: { judgeId: string; score: number }[];
  totalScore: number;
  averageScore: number;
}

export interface Judge {
  id: string;
  name: string;
  floorId?: string;
  currentAssignmentId?: string;
  completedAssignments: number;
}

export interface Floor {
  id: string;
  name: string;
  index: number;
  teamNumberStart: number;
  teamNumberEnd: number;
}

export interface Assignment {
  id: string;
  judgeId: string;
  teamIds: string[];
  submitted: boolean;
  createdAt: any; // Firebase Timestamp
  floorId: string;
}

export interface Event {
  id: string;
  name: string;
}

export type Page = "admin" | "teams" | "assignments" | "results" | string; // For floor IDs

export type ToastType = "info" | "success" | "warning" | "error";
export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export interface AppContextType {
  judges: Judge[];
  teams: Team[];
  assignments: Assignment[];
  floors: Floor[];
  events: Event[];
  page: Page;
  setPage: (page: Page) => void;
  currentEvent: Event | null;
  setCurrentEventId: (id: string | null) => void;
  showToast: (message: string, type?: ToastType) => void;
  isLoading: boolean;
}
// --- End Type Definitions ---

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
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
      setTeams([]);
      setAssignments([]);
      setFloors([]);
      setPage("admin");
      return;
    }
    setIsLoading(true);
    const collections = {
      judges: `events/${currentEventId}/judges`,
      teams: `events/${currentEventId}/teams`,
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
      onSnapshot(collection(db, collections.teams), (s) =>
        setTeams(
          s.docs
            .map((d) => ({ ...d.data(), id: d.id }) as Team)
            .sort((a, b) => a.number - b.number),
        ),
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
      teams,
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
      teams,
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
      <div className="min-h-screen font-sans text-zinc-200">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <main className="mx-auto max-w-7xl p-4 py-6 pt-0">
          <Navbar />
          <div className="h-full pt-26">{children}</div>
        </main>
      </div>
    </AppContext.Provider>
  );
};
