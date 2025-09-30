import { Timestamp } from "firebase/firestore";

export interface Judge {
  id: string;
  name: string;
  currentAssignmentId?: string;
  completedAssignments: number;
}

export interface Room {
  id: string;
  number: string;
  floor: 0 | 1;
}

export interface Project {
  id: string;
  name: string;
  roomId: string;
  floor: 0 | 1;
  reviewingJudges: string[];
  reviewedBy: { judgeId: string; score: number }[];
  totalScore: number;
  averageScore: number;
}

export interface Assignment {
  id: string;
  judgeId: string;
  projectIds: string[];
  submitted: boolean;
  createdAt: Timestamp;
}

export type Page = "admin" | "floor0" | "floor1" | "judge" | "results";
