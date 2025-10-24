"use client";
import React, { useState } from "react";
import {
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
  // Removed collection, onSnapshot, query, orderBy
} from "firebase/firestore";
import {
  PlusCircle,
  ShieldAlert,
  LogOut,
  Loader2,
  Mail,
  KeyRound,
  Trophy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, db } from "../../firebase/config";
import {
  // Removed onAuthStateChanged
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
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
  <div className="flex h-full flex-col justify-between rounded-xl border border-white/10 bg-zinc-900/50 p-5 shadow-lg backdrop-blur-md">
    <div>
      <div className="mb-2 h-6 w-3/4 animate-pulse rounded-full bg-zinc-800/60"></div>
      <div className="h-4 w-1/4 animate-pulse rounded-full bg-zinc-800/60"></div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-4 w-full animate-pulse rounded-full bg-zinc-800/60"></div>
      <div className="h-5 w-full animate-pulse rounded-full bg-zinc-800/60"></div>
    </div>
  </div>
);

// --- UPDATED Auth Form Component (Styling adjustments) ---
const AuthForm = ({
  showToast,
  onClose, // New prop to close the form/modal
}: {
  showToast: (message: string, type: "success" | "error" | "info") => void;
  onClose?: () => void; // Optional close handler
}) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      return showToast("Please enter both email and password.", "error");
    }
    setIsLoading(true);

    try {
      if (isLoginView) {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Welcome back!", "success");
        onClose?.(); // Close on success
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        showToast("Account created successfully!", "success");
        onClose?.(); // Close on success
      }
    } catch (error: any) {
      const friendlyMessage =
        error.code === "auth/user-not-found"
          ? "No account found with that email."
          : error.code === "auth/wrong-password"
            ? "Incorrect password."
            : error.code === "auth/email-already-in-use"
              ? "That email is already in use."
              : "An error occurred. Please try again.";
      showToast(friendlyMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Removed outer flex container, will be placed in a modal/overlay
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-md rounded-xl border border-zinc-700 bg-zinc-900 p-8 shadow-2xl"
      onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
    >
      <h2 className="mb-6 text-center text-2xl font-bold text-slate-100">
        {isLoginView ? "Admin Login" : "Create Account"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="!bg-zinc-800/50 pl-10" // Slightly darker input
          />
        </div>
        <div className="relative">
          <KeyRound className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="!bg-zinc-800/50 pl-10" // Slightly darker input
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 hover:from-orange-600 hover:to-orange-700 hover:shadow-orange-500/50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isLoginView ? (
            "Login"
          ) : (
            "Sign Up"
          )}
        </Button>
      </form>
      <button
        onClick={() => setIsLoginView(!isLoginView)}
        className="mt-4 w-full text-center text-sm text-zinc-400 transition-colors hover:text-orange-400"
      >
        {isLoginView
          ? "Need an account? Sign Up"
          : "Already have an account? Login"}
      </button>
    </motion.div>
  );
};

// --- NEW Landing Screen Component ---
const LandingScreen = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <div className="absolute top-0 left-0 flex h-screen w-screen flex-col items-center justify-center overflow-hidden p-8 text-center backdrop-blur-lg">
      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center"
      >
        <Trophy className="size-16 text-orange-500" />
        <h1 className="mt-6 bg-gradient-to-br from-white via-zinc-300 to-zinc-500 bg-clip-text text-6xl font-bold tracking-tight text-transparent md:text-7xl">
          Podium
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
          Streamlined Judging & Event Management for Hackathons.
        </p>
        <Button
          onClick={onGetStarted}
          size="lg"
          className="mt-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 px-8 py-3 text-lg shadow-lg shadow-orange-500/30 transition-all duration-300 hover:scale-105 hover:from-orange-600 hover:to-orange-700 hover:shadow-orange-500/50"
        >
          Get Started
        </Button>
      </motion.div>
    </div>
  );
};

const EventSetupPanel = () => {
  // --- Use context for auth, loading, and data ---
  const {
    user,
    authLoading,
    isLoading, // This is the combined data/auth loading state
    events,
    setCurrentEventId,
    showToast,
  } = useAppContext();

  // --- Removed redundant local state ---
  // const [user, setUser] = useState<User | null>(null);
  // const [authLoading, setAuthLoading] = useState(true);
  // const [events, setEvents] = useState<Event[]>([]);
  // const [dataLoading, setDataLoading] = useState(true);

  // --- Local state for forms is still needed ---
  const [showAuthForm, setShowAuthForm] = useState(false); // State to control auth form visibility
  const [eventName, setEventName] = useState("");
  const [eventYear, setEventYear] = useState(new Date().getFullYear());
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  // --- Removed redundant auth useEffect ---
  // useEffect(() => { ... onAuthStateChanged ... }, []);

  // --- Removed redundant data fetching useEffect ---
  // useEffect(() => { ... onSnapshot ... }, [user, authLoading, showToast]);

  const generateEventId = (name: string, year: number): string => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    return `${slug}-${year}`;
  };

  const createEvent = async () => {
    if (!user) return showToast("You must be logged in.", "error");

    if (!eventName.trim()) {
      return showToast("Event name cannot be empty.", "error");
    }

    const eventId = generateEventId(eventName, eventYear);
    const eventFullName = `${eventName.trim()} ${eventYear}`;

    if (events.some((e) => e.id === eventId)) {
      return showToast(`Event "${eventFullName}" already exists.`, "error");
    }

    const newEvent: Event = {
      id: eventId,
      name: eventFullName,
      createdAt: Timestamp.now(),
      ownerId: user.uid,
    };

    // This path is correct per the new paradigm
    await setDoc(doc(db, "users", user.uid, "events", newEvent.id), newEvent);

    showToast(`Event "${newEvent.name}" created!`, "success");
    setCurrentEventId(newEvent.id);
    setEventName("");
  };

  const handleDeleteRequest = (event: Event) => {
    setEventToDelete(event);
    setConfirmOpen(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete || !user) return;

    try {
      // This path is correct and will trigger the AppProvider's listener
      await deleteDoc(doc(db, "users", user.uid, "events", eventToDelete.id));
      showToast(`Event "${eventToDelete.name}" was deleted.`, "success");
    } catch (error) {
      console.error("Failed to delete event:", error);
      showToast("Could not delete the event.", "error");
    } finally {
      setConfirmOpen(false);
      setEventToDelete(null);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    showToast("You have been signed out.", "info");
    setCurrentEventId(null);
  };

  // --- RENDER LOGIC ---

  // Use context's authLoading state
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="size-12 animate-spin text-orange-500" />
      </div>
    );
  }

  // Use context's user state
  if (!user) {
    return (
      <>
        <LandingScreen onGetStarted={() => setShowAuthForm(true)} />

        {/* Auth Form Modal/Overlay */}
        <AnimatePresence>
          {showAuthForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
              onClick={() => setShowAuthForm(false)} // Close modal on overlay click
            >
              <AuthForm
                showToast={showToast}
                onClose={() => setShowAuthForm(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // User is logged in, show the setup panel
  const MIN_CARDS = 12;
  // Use context's combined isLoading state
  const skeletonCount = isLoading
    ? MIN_CARDS - 1
    : Math.max(0, MIN_CARDS - (events.length + 1));

  return (
    <>
      <div className="space-y-12 py-4 sm:py-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-4">
            {/* Using Podium Logo when logged in too */}
            <h1 className="bg-gradient-to-br from-white via-zinc-300 to-zinc-500 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-6xl">
              Podium Setup
            </h1>
          </div>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
            Welcome! Launch a new event or manage your existing hackathons.
          </p>
          <div className="mx-auto mt-3 flex w-min items-center gap-2 rounded-full border border-zinc-950 bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 py-1 pr-1 pl-3 text-sm font-medium whitespace-nowrap text-zinc-200 shadow-lg ring-1 shadow-black/20 ring-white/10 ring-inset">
            Signed in as:
            <span className="text-orange-400"> {user.email}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="ml-1 h-full rounded-xl bg-orange-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="size-5 py-1 text-zinc-900 hover:text-orange-800" />{" "}
              {/* Slightly smaller icon fits better */}
            </Button>
          </div>
        </div>
        <motion.div
          className="grid auto-rows-fr grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* --- Create Event Card --- */}
          <Card className="flex h-full flex-col border-2 border-orange-500/80 p-5 shadow-2xl shadow-orange-500/20">
            {" "}
            {/* Added padding */}
            <div className="flex h-full flex-col justify-center">
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
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30 hover:from-orange-600 hover:to-orange-700 hover:shadow-orange-500/50"
                >
                  <PlusCircle className="h-4 w-4" /> Create Event
                </Button>
              </form>
            </div>
          </Card>

          {/* --- Event Cards & Skeletons --- */}
          {/* Use context's isLoading state */}
          {isLoading
            ? Array.from({ length: skeletonCount }).map((_, i) => (
                <EventCardSkeleton key={i} />
              ))
            : // Use context's events list
              events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onDelete={() => handleDeleteRequest(event)}
                />
              ))}
          {!isLoading &&
            skeletonCount > 0 &&
            Array.from({ length: skeletonCount }).map((_, i) => (
              <EventCardSkeleton key={`skel-${i}`} />
            ))}
        </motion.div>
      </div>

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
          This action is irreversible and will delete all associated data.
        </p>
      </ConfirmationDialog>
    </>
  );
};

export default EventSetupPanel;
