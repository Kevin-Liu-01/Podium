"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"; // Added query, orderBy
import { auth, db } from "../../firebase/config"; // Added auth
import { onAuthStateChanged, type User } from "firebase/auth"; // Added auth imports
import { AppContext } from "../../context/AppContext";
import Navbar from "./Navbar";
import ToastContainer from "../toast/ToastContainer";

// --- Type Definitions (Keep these as they are) ---
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
  hasSwitchedFloors: boolean; // Added this based on other files
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
  createdAt: unknown; // Firebase Timestamp
  floorId: string;
}

export interface Event {
  id: string;
  name: string;
  createdAt: unknown; // Added based on EventSetupPanel
  ownerId?: string; // Added based on EventSetupPanel
}

export type Page = "admin" | "teams" | "assignments" | "results"; // For floor IDs

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
  user: User | null; // <-- ADDED USER
  authLoading: boolean; // <-- ADDED AUTH LOADING STATE
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
  const [page, setPage] = useState<Page>("admin"); // Default page might change based on auth
  const [dataLoading, setDataLoading] = useState(true); // Renamed from isLoading for clarity

  // --- Toast State ---
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

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
        setPage("admin"); // Or redirect to a landing/login page logic elsewhere
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Effect for Fetching User's Events ---
  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (user) {
      // User is logged in, fetch their events
      setDataLoading(true);
      const userEventsCollection = collection(db, "users", user.uid, "events");
      const q = query(userEventsCollection, orderBy("createdAt", "desc"));

      const unsubEvents = onSnapshot(
        q,
        (snapshot) => {
          const fetchedEvents = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Event,
          );
          setEvents(fetchedEvents);
          // If the current event doesn't belong to this user, clear it
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
      // User is logged out, clear events
      setEvents([]);
      setCurrentEventId(null); // Ensure current event is cleared
      setDataLoading(false);
    }
  }, [user, authLoading, showToast]); // Depend on user and authLoading

  // --- Effect for Fetching Data for the *Selected* Event ---
  // Note: Sub-collections (judges, teams etc.) still seem to live under the global /events path based on previous code.
  // If they should also be under users/{userId}/events/{eventId}/..., update the paths below.
  useEffect(() => {
    // Only fetch if a user is logged in AND an event is selected
    if (!currentEventId || !user) {
      setJudges([]);
      setTeams([]);
      setAssignments([]);
      setFloors([]);
      if (!authLoading) setDataLoading(false); // Stop loading if auth is done and no event/user
      return;
    }

    setDataLoading(true);
    // *** THIS IS THE CHANGED LINE ***
    // All sub-collections are now fetched from the user's event document
    const basePath = `users/${user.uid}/events/${currentEventId}`;

    const collections = {
      judges: `${basePath}/judges`,
      teams: `${basePath}/teams`,
      assignments: `${basePath}/assignments`,
      floors: `${basePath}/floors`,
    };

    let active = true; // Flag to prevent setting state after unmount

    const unsubJudges = onSnapshot(
      collection(db, collections.judges),
      (s) => {
        if (!active) return;
        setJudges(
          s.docs
            .map((d) => ({ ...d.data(), id: d.id }) as Judge)
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      },
      (err) => console.error("Judge snapshot error:", err),
    );

    const unsubTeams = onSnapshot(
      collection(db, collections.teams),
      (s) => {
        if (!active) return;
        setTeams(
          s.docs
            .map((d) => ({ ...d.data(), id: d.id }) as Team)
            .sort((a, b) => a.number - b.number),
        );
      },
      (err) => console.error("Team snapshot error:", err),
    );

    const unsubAssignments = onSnapshot(
      collection(db, collections.assignments),
      (s) => {
        if (!active) return;
        setAssignments(
          s.docs.map((d) => ({ ...d.data(), id: d.id }) as Assignment),
        );
      },
      (err) => console.error("Assignment snapshot error:", err),
    );

    const unsubFloors = onSnapshot(
      collection(db, collections.floors),
      (s) => {
        if (!active) return;
        setFloors(
          s.docs
            .map((d) => ({ ...d.data(), id: d.id }) as Floor)
            .sort((a, b) => a.index - b.index),
        );
        setDataLoading(false); // Set loading false after the last fetch completes
      },
      (err) => {
        console.error("Floor snapshot error:", err);
        if (!active) return;
        setDataLoading(false); // Also stop loading on error
      },
    );

    // Cleanup function
    return () => {
      active = false; // Prevent state updates after unmount/dependency change
      unsubJudges();
      unsubTeams();
      unsubAssignments();
      unsubFloors();
    };
  }, [currentEventId, user, authLoading]); // Depend on currentEventId AND user

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
      events, // Now user-specific
      page,
      setPage,
      currentEvent,
      setCurrentEventId,
      showToast,
      isLoading: dataLoading || authLoading, // Combined loading state
      user, // Pass user down
      authLoading, // Pass authLoading down
    }),
    [
      judges,
      teams,
      assignments,
      floors,
      events,
      page,
      currentEvent,
      dataLoading, // Use combined state
      authLoading,
      showToast,
      user,
    ],
  );

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="min-h-screen font-sans text-zinc-200">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <main className="mx-auto max-w-7xl p-4 py-6 pt-0">
          <Navbar />
          <div className="z-20 h-full pt-26">{children}</div>
        </main>
      </div>
    </AppContext.Provider>
  );
};
