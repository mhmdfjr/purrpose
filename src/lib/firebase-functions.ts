import { auth } from "@/lib/firebase";

// Vercel API routes — stay on Spark free (no Cloud Functions Blaze required)
// Each callable now hits /api/* with Bearer ID token, verified via Admin SDK

async function callApi<T>(path: string, data: unknown): Promise<{ data: T }> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const idToken = await user.getIdToken();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((json as { error?: string }).error || `Request failed ${res.status}`) as Error & { code?: string };
    // Map to Firebase-like code for existing UI error handling
    (err as unknown as { code?: string }).code = (json as { code?: string }).code || `http-${res.status}`;
    throw err;
  }
  return { data: json as T };
}

export function getEnsureUserCallable() {
  return (data: { timezone: string; displayName?: string }) => callApi<{ created: boolean; uid: string }>("/api/user/ensure", data);
}
export function getUpdateProfileCallable() {
  return (data: { displayName?: string; avatarUrl?: string; city?: string; timezone?: string; aiReportEnabled?: boolean }) =>
    callApi<{ updated: boolean }>("/api/user/update", data);
}
export function getCreateTaskCallable() {
  return (data: { category: "hustle" | "humble"; title: string; level: number; durationHours: number; date: string }) =>
    callApi<{ taskId: string; status: string }>("/api/tasks/create", data);
}
export function getUpdateTaskCallable() {
  return (data: { taskId: string; updates: Partial<{ title: string; level: number; durationHours: number; date: string; category: "hustle" | "humble" }> }) =>
    callApi<{ taskId: string; updated: boolean }>("/api/tasks/update", data);
}
export function getDeleteTaskCallable() {
  return (data: { taskId: string }) => callApi<{ taskId: string; deleted: boolean }>("/api/tasks/delete", data);
}
export function getCompleteTaskCallable() {
  return (data: { taskId: string }) => callApi<{ taskId: string; status: string; score: number }>("/api/tasks/complete", data);
}
export function getRegenerateSuggestionCallable() {
  return (data: { weekId: string }) => callApi<{ weekId: string; aiSuggestion: string }>("/api/weekly/regenerate", data);
}
