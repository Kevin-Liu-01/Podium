"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Query,
} from "firebase/firestore";
import { auth, db } from "../../firebase/config"; // Ensure path is correct
import { onAuthStateChanged, type User } from "firebase/auth";
import { AppContext } from "../../context/AppContext"; // Ensure path is correct
import Navbar from "./Navbar"; // Ensure path is correct
import ToastContainer from "../toast/ToastContainer"; // Ensure path is correct

// Import ALL shared types from the single source of truth
import type {
  Team,
  Judge,
  Floor,
  Assignment,
  Event,
  Project,
  Room,
  Page,
  Toast,
  ToastType,
  AppContextType,
} from "../../lib/types"; // Adjust path as needed

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // --- Auth State ---
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- Data State ---
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [teams, setTeams] = useState<Team[]>([]); // Keep setTeams accessible
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [page, setPage] = useState<Page>("admin");
  const [dataLoading, setDataLoading] = useState(true);

  // --- Toast State ---
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      options?: { duration?: number },
    ) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => removeToast(id), options?.duration ?? 3000);
    },
    [],
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
        setProjects([]);
        setRooms([]);
        setPage("admin");
      }
    });
    return () => unsubscribe();
  }, []); // Runs once on mount

  // --- Effect for Fetching User's Events ---
  useEffect(() => {
    if (authLoading) return; // Wait for auth check

    if (user) {
      const userEventsCollection = collection(db, "users", user.uid, "events");
      const q = query(userEventsCollection, orderBy("createdAt", "desc"));

      const unsubEvents = onSnapshot(
        q,
        (snapshot) => {
          const fetchedEvents = snapshot.docs.map(
            (doc) => ({ id: doc.id, ...doc.data() }) as Event,
          );
          setEvents(fetchedEvents);

          // Clear current event if it's no longer in the fetched list
          if (
            currentEventId &&
            !fetchedEvents.some((e) => e.id === currentEventId)
          ) {
            setCurrentEventId(null);
          }
        },
        (error) => {
          console.error("Error fetching user events:", error);
          showToast("Could not fetch your events.", "error");
          setEvents([]); // Clear events on error
          setCurrentEventId(null);
        },
      );
      return () => unsubEvents();
    } else {
      // User logged out
      setEvents([]);
      setCurrentEventId(null);
    }
  }, [user, authLoading, showToast]); // Dependencies for fetching events list

  // --- Effect for Fetching Data for the *Selected* Event ---
  useEffect(() => {
    // Only fetch if logged in, event selected, and auth check complete
    if (!currentEventId || !user || authLoading) {
      // Clear data if no event/user or still checking auth
      setJudges([]);
      setTeams([]);
      setAssignments([]);
      setFloors([]);
      setProjects([]);
      setRooms([]);
      // Set loading false *only* if auth is done and we have no user/event
      if (!authLoading) setDataLoading(false);
      return () => { }; // Return empty cleanup
    }

    setDataLoading(true); // Start loading when dependencies are valid
    const basePath = `users/${user.uid}/events/${currentEventId}`;

    // Define collections to listen to
    const collectionsToListen = [
      {
        path: `${basePath}/judges`,
        setter: setJudges,
        sortFn: (a: Judge, b: Judge) => a.name.localeCompare(b.name),
      },
      {
        path: `${basePath}/teams`,
        setter: setTeams,
        sortFn: (a: Team, b: Team) => a.number - b.number,
      },
      { path: `${basePath}/assignments`, setter: setAssignments },
      {
        path: `${basePath}/floors`,
        setter: setFloors,
        sortFn: (a: Floor, b: Floor) => a.index - b.index,
      },
      { path: `${basePath}/projects`, setter: setProjects },
      { path: `${basePath}/rooms`, setter: setRooms },
    ];

    const unsubs: (() => void)[] = [];
    let listenersInitialized = 0;
    const totalListeners = collectionsToListen.length; // Keep track of total

    collectionsToListen.forEach(({ path, setter, sortFn }) => {
      const collRef = collection(db, path);
      const q: Query = query(collRef); // Basic query, add orderBy if needed globally

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          // Use a generic type T for sorting, apply specific type during state update
          let data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));

          if (sortFn) {
            // Sort using 'as any' since sortFn expects specific types T, but data is generic here
            data = data.sort(sortFn as any);
          }

          // Apply specific type casting during state update
          // This assumes the data structure matches the expected type
          if (path.includes("/judges")) setter(data as Judge[]);
          else if (path.includes("/teams")) setter(data as Team[]);
          else if (path.includes("/assignments")) setter(data as Assignment[]);
          else if (path.includes("/floors")) setter(data as Floor[]);
          else if (path.includes("/projects")) setter(data as Project[]);
          else if (path.includes("/rooms")) setter(data as Room[]);
          else setter(data as any[]); // Fallback with 'as any[]'

          // Check if all listeners have loaded at least once
          if (listenersInitialized < totalListeners) {
            listenersInitialized++;
          }
          if (listenersInitialized === totalListeners) {
            setDataLoading(false); // Set loading false only after all have initialized
          }
        },
        (error) => {
          console.error(`Error fetching ${path}:`, error);
          showToast(
            `Could not fetch data for ${path.split("/").pop()}.`,
            "error",
          );
          setter([]); // Clear data on error

          // Still count towards initialized listeners even on error to eventually stop loading
          if (listenersInitialized < totalListeners) {
            listenersInitialized++;
          }
          if (listenersInitialized === totalListeners) {
            setDataLoading(false);
          }
        },
      );
      unsubs.push(unsubscribe);
    });

    // Cleanup function
    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [currentEventId, user, authLoading, showToast]); // Effect dependencies

  const currentEvent = useMemo(
    () => events.find((e) => e.id === currentEventId) || null,
    [events, currentEventId],
  );

  // Provide all data states in the context value
  const appContextValue: AppContextType = useMemo(
    () => ({
      judges,
      teams,
      setTeams, // Provide setTeams
      assignments,
      floors,
      projects,
      rooms,
      events,
      page,
      setPage,
      currentEvent,
      setCurrentEventId,
      showToast,
      isLoading: dataLoading || authLoading, // Combined loading state
      user,
      authLoading,
    }),
    [
      // Ensure all state variables used in the object are listed here
      judges,
      teams,
      setTeams, // Include setTeams in dependency array
      assignments,
      floors,
      projects,
      rooms,
      events,
      page,
      currentEvent,
      dataLoading,
      authLoading,
      showToast,
      user,
    ],
  );

  return (
    <AppContext.Provider value={appContextValue}>
      <div className="min-h-screen font-sans text-zinc-200">
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <main className="z-20 mx-auto max-w-7xl px-4 pt-0 pb-6">
          <Navbar />
          <div className="z-20 h-full pt-24 md:pt-28">{children}</div>
        </main>
      </div>
    </AppContext.Provider>
  );
};
