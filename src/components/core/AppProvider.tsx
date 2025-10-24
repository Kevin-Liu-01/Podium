"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { onAuthStateChanged, type User } from "firebase/auth";
import { AppContext } from "../../context/AppContext";
import Navbar from "./Navbar";
import ToastContainer from "../toast/ToastContainer";
import type { Timestamp } from "firebase/firestore"; // Import Timestamp

// --- Type Definitions ---
export interface Team {
  id: string;
  name: string;
  number: number;
  floorId: string;
  reviewedBy: Review[]; // Use Review type
  totalScore: number;
  averageScore: number;
}

// Added Review Type
export interface Review {
  judgeId: string;
  score: number;
  rank: 0 | 1 | 2 | 3; // 0 for unranked, 1 for 1st, etc.
}

export interface Judge {
  id: string;
  name: string;
  floorId?: string;
  currentAssignmentId?: string;
  completedAssignments: number;
  hasSwitchedFloors: boolean;
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
  createdAt: Timestamp; // Use Firebase Timestamp type
  floorId: string;
}

export interface Event {
  id: string;
  name: string;
  createdAt: Timestamp; // Use Firebase Timestamp type
  ownerId?: string;
}

// --- [MODIFIED] Page Type ---
// Broadened to include string for floor IDs
export type Page = "admin" | "teams" | "assignments" | "results" | string;

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
  showToast: (
    message: string,
    type?: ToastType,
    options?: { duration?: number },
  ) => void; // Added options
  isLoading: boolean;
  user: User | null;
  authLoading: boolean;
}
// --- End Type Definitions ---

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // --- Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- Data State ---
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [page, setPage] = useState<Page>("admin");
  const [dataLoading, setDataLoading] = useState(true);

  // --- Toast State ---
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Updated showToast to accept options like duration
  const showToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      options?: { duration?: number },
    ) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      // Use provided duration or default (e.g., 3000ms)
      setTimeout(() => removeToast(id), options?.duration ?? 3000);
    },
    [],
  );

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- Effect for Auth State ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (!currentUser) {
        // Clear everything if user logs out
        setCurrentEventId(null);
        setEvents([]);
        setJudges([]);
        setTeams([]);
        setAssignments([]);
        setFloors([]);
        setPage("admin");
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Effect for Fetching User's Events ---
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      setDataLoading(true);
      const userEventsCollection = collection(db, "users", user.uid, "events");
      const q = query(userEventsCollection, orderBy("createdAt", "desc"));

      const unsubEvents = onSnapshot(
        q,
        (snapshot) => {
          const fetchedEvents = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Event, // Cast to Event
          );
          setEvents(fetchedEvents);
          if (
            currentEventId &&
            !fetchedEvents.some((e) => e.id === currentEventId)
          ) {
            setCurrentEventId(null);
          }
          setDataLoading(false);
        },
        (error) => {
          console.error("Error fetching user events:", error);
          showToast("Could not fetch your events.", "error");
          setDataLoading(false);
        },
      );
      return () => unsubEvents();
    } else {
      setEvents([]);
      setCurrentEventId(null);
      setDataLoading(false);
    }
  }, [user, authLoading, currentEventId, showToast]); // Added currentEventId

  // --- Effect for Fetching Data for the *Selected* Event ---
  useEffect(() => {
    if (!currentEventId || !user || authLoading) {
      // Check authLoading here too
      setJudges([]);
      setTeams([]);
      setAssignments([]);
      setFloors([]);
      if (!authLoading) setDataLoading(false);
      return () => {}; // Return empty cleanup function
    }

    setDataLoading(true);
    const basePath = `users/${user.uid}/events/${currentEventId}`;
    const collectionsMap = {
      judges: collection(db, `${basePath}/judges`),
      teams: collection(db, `${basePath}/teams`),
      assignments: collection(db, `${basePath}/assignments`),
      floors: collection(db, `${basePath}/floors`),
    };

    const unsubs: (() => void)[] = []; // Store unsubscribe functions

    const createListener = <T,>(
      ref: ReturnType<typeof collection>,
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      sortFn?: (a: T, b: T) => number,
    ) => {
      const q = query(ref); // Apply query if needed, e.g., orderBy
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          let data = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as T,
          );
          if (sortFn) {
            data = data.sort(sortFn);
          }
          setter(data);
        },
        (error) => {
          console.error(`Error fetching ${ref.path}:`, error);
          showToast(`Could not fetch data for ${ref.path}.`, "error");
          // Optionally clear data on error: setter([]);
        },
      );
      unsubs.push(unsubscribe);
    };

    createListener<Judge>(collectionsMap.judges, setJudges, (a, b) =>
      a.name.localeCompare(b.name),
    );
    createListener<Team>(
      collectionsMap.teams,
      setTeams,
      (a, b) => a.number - b.number,
    );
    createListener<Assignment>(collectionsMap.assignments, setAssignments);
    createListener<Floor>(
      collectionsMap.floors,
      setFloors,
      (a, b) => a.index - b.index,
    );

    // Set loading false after setting up listeners (or maybe after first data comes in?)
    // Let's assume setting up listeners is fast enough.
    // We need a way to track if *all* listeners have returned data at least once.
    // For simplicity now, just set loading false after a short delay or in the last listener.
    const unsubFloors = onSnapshot(collectionsMap.floors, () => {
      setDataLoading(false); // Set loading false in the last listener callback
    });
    unsubs.push(unsubFloors);

    // Cleanup function
    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [currentEventId, user, authLoading, showToast]); // Added showToast dependency

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
      isLoading: dataLoading || authLoading,
      user,
      authLoading,
    }),
    [
      judges,
      teams,
      assignments,
      floors,
      events,
      page,
      currentEvent,
      dataLoading,
      authLoading,
      showToast, // showToast doesn't change, but include if logic depends on it
      user,
    ],
  );

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="min-h-screen font-sans text-zinc-200">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <main className="mx-auto max-w-7xl p-4 py-6 pt-0">
          <Navbar />
          {/* Ensure Navbar doesn't overlap content */}
          <div className="z-20 h-full pt-24 md:pt-28 lg:pt-32">{children}</div>
        </main>
      </div>
    </AppContext.Provider>
  );
};
