// Shared TypeScript types used by both Next.js app and Cloud Functions
// Per ARCHITECTURE.md Section 11, this folder is copied to functions/ during build
// or duplicated manually if build step is overkill. For M0, keep as single source.

export type TaskCategory = "hustle" | "humble";
export type TaskStatus = "pending" | "completed" | "missed";

export interface Task {
  category: TaskCategory;
  title: string;
  level: number; // 1-5
  durationHours: number;
  date: string; // YYYY-MM-DD
  status: TaskStatus;
  score: number | null;
  createdAt: FirestoreTimestamp | Date;
  completedAt?: FirestoreTimestamp | Date | null;
  missedAt?: FirestoreTimestamp | Date | null;
}

export interface UserProfile {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  city: string;
  cityManualOverride: boolean;
  timezone: string;
  utcResetHour: number;
  aiReportEnabled: boolean;
  currentGroupId: string | null;
  createdAt: FirestoreTimestamp | Date;
  updatedAt: FirestoreTimestamp | Date;
}

// Minimal Firestore Timestamp type to avoid importing firebase in shared without deps
export interface FirestoreTimestamp {
  toDate(): Date;
  seconds: number;
  nanoseconds: number;
}
