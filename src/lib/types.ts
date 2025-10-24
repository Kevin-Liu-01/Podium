import type { Timestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import React from "react"; // Import React for SetStateAction

// Core Data Structures
// ====================

export interface Judge {
  id: string;
  name: string;
  floorId?: string; // Optional for unassigned judges
  currentAssignmentId?: string;
  completedAssignments: number;
  hasSwitchedFloors: boolean;
}

export interface Team {
  id: string;
  name: string;
  number: number;
  floorId: string;
  reviewedBy: Review[]; // Array of review details
  totalScore: number;
  averageScore: number;
}

// Represents a physical location/table
export interface Room {
  id: string;
  number: string; // Can be string like 'A101'
  floorId: string;
}

// Represents a floor/area in the venue
export interface Floor {
  id: string;
  name: string;
  index: number; // For ordering
  teamNumberStart: number;
  teamNumberEnd: number;
}

// Represents a single review/score given by a judge
export interface Review {
  judgeId: string;
  score: number;
  rank: 1 | 2 | 3 | 0; // 0 represents 'Unranked'
}

// Represents a project presentation/table assignment (distinct from Team)
export interface Project {
  id: string;
  name: string; // Often team name, but can differ
  roomId: string; // Link to physical room/table
  floorId: string;
  teamId: string; // Link back to the Team entity
}

// Represents a judge's current or past assignment
export interface Assignment {
  id: string;
  judgeId: string;
  teamIds: string[]; // Teams being judged in this assignment
  submitted: boolean;
  createdAt: Timestamp; // Firestore Timestamp
  floorId: string; // Floor where assignment takes place
}

// Represents a specific hackathon event
export interface Event {
  id: string;
  name: string;
  createdAt: Timestamp; // Firestore Timestamp
  ownerId?: string; // Optional ID of the user who created it
}

// UI & Context Related Types
// ==========================

export type ToastType = "success" | "error" | "info" | "warning";
export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

// Defines valid page identifiers in the app
export type Page =
  | "admin"
  | "assignments"
  | "results"
  | "projects"
  | "teams"
  | string; // Allows floor IDs as page identifiers

// Used for input modes (e.g., in TeamSetup)
export type InputMode = "single" | "bulk";

// Defines the shape of the global App Context
export interface AppContextType {
  // Data State
  judges: Judge[];
  teams: Team[];
  projects: Project[];
  assignments: Assignment[];
  floors: Floor[];
  rooms: Room[];
  events: Event[];
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>; // Expose setTeams

  // UI State
  page: Page;
  setPage: (page: Page) => void;
  currentEvent: Event | null;
  setCurrentEventId: (id: string | null) => void;

  // Feedback Mechanism
  showToast: (
    message: string,
    type?: ToastType,
    options?: { duration?: number }, // Optional duration for toast
  ) => void;

  // Loading States
  isLoading: boolean; // Combined data loading state

  // Authentication State
  user: User | null; // Currently logged-in Firebase user
  authLoading: boolean; // True while checking auth status initially
}
