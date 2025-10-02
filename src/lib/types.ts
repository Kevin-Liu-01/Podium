import type { Timestamp } from "firebase/firestore";

export interface Judge {
  floorId: string;
  id: string;
  name: string;
  currentAssignmentId?: string;
  completedAssignments: number;
}
export interface Room {
  id: string;
  number: string;
  floorId: string;
}
export interface Floor {
  id: string;
  name: string;
  index: number;
}
export interface Review {
  judgeId: string;
  score: number;
  rank: 1 | 2 | 3 | 0;
}
export interface Project {
  id: string;
  name: string;
  roomId: string;
  floorId: string;
  reviewedBy: Review[];
  totalScore: number;
  averageScore: number;
}
export interface Assignment {
  teamIds: any;
  id: string;
  judgeId: string;
  projectIds: string[];
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
export type Page = "admin" | "assignments" | "results" | "projects" | string;
export type InputMode = "single" | "bulk";

export interface AppContextType {
  judges: Judge[];
  rooms: Room[];
  projects: Project[];
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
