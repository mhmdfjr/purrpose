import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export function getEnsureUserCallable() {
  return httpsCallable<{ timezone: string; displayName?: string }, { created: boolean; uid: string }>(functions, "ensureUser");
}

export function getUpdateProfileCallable() {
  return httpsCallable<
    { displayName?: string; avatarUrl?: string; city?: string; timezone?: string; aiReportEnabled?: boolean },
    { updated: boolean }
  >(functions, "updateProfile");
}

export function getCreateTaskCallable() {
  return httpsCallable<
    { category: "hustle" | "humble"; title: string; level: number; durationHours: number; date: string },
    { taskId: string; status: string }
  >(functions, "createTask");
}
export function getUpdateTaskCallable() {
  return httpsCallable<
    { taskId: string; updates: Partial<{ title: string; level: number; durationHours: number; date: string; category: "hustle" | "humble" }> },
    { taskId: string; updated: boolean }
  >(functions, "updateTask");
}
export function getDeleteTaskCallable() {
  return httpsCallable<{ taskId: string }, { taskId: string; deleted: boolean }>(functions, "deleteTask");
}
export function getCompleteTaskCallable() {
  return httpsCallable<{ taskId: string }, { taskId: string; status: string; score: number }>(functions, "completeTask");
}
export function getRegenerateSuggestionCallable() {
  return httpsCallable<{ weekId: string }, { weekId: string; aiSuggestion: string }>(functions, "regenerateWeeklySuggestion");
}
