import { Timestamp } from "firebase/firestore";

// Judge now has a floorId for location assignment
export interface Judge {
  id: string;
  name: string;
  floorId?: string; // ID of the floor the judge is assigned to
  currentAssignmentId?: string;
  completedAssignments: number;
}

// Floor is now defined by a range of team numbers
export interface Floor {
  id: string;
  name: string;
  startTeamNumber: number;
  endTeamNumber: number;
}

// Room interface has been removed

// Project interface is now Team
export interface Team {
  id: string;
  number: number; // Changed from name: string
  floorId: string; // Derived from the floor's range
  reviewedBy: Review[];
  totalScore: number;
  averageScore: number;
}

export interface Review {
  judgeId: string;
  score: number;
  rank: 1 | 2 | 3 | 0;
}

export interface Assignment {
  id: string;
  judgeId: string;
  teamIds: string[]; // Changed from projectIds
  submitted: boolean;
  createdAt: Timestamp;
  floorId: string;
}

export interface Event {
  id: string;
  name: string;
}

export type ToastType = "success" | "error" | "info";
export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export type Page =
  | "admin"
  | "judge-assignment"
  | "assignments"
  | "results"
  | string;
export type InputMode = "single" | "bulk";

export interface AppContextType {
  judges: Judge[];
  teams: Team[]; // Changed from projects
  assignments: Assignment[];
  floors: Floor[];
  events: Event[];
  page: Page;
  setPage: (page: Page) => void;
  currentEvent: Event | null;
  setCurrentEventId: (id: string | null) => void;
  showToast: (message: string, type: ToastType) => void;
  isLoading: boolean;
}
