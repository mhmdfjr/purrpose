import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { enforceAppCheck } from "../utils/appCheck";

const db = admin.firestore();
const PER_TASK_CAP = 16; // flat, could be from Remote Config
const DAILY_CAP = 24;

function getCapHours() {
  // Future: fetch from Remote Config; for M2 use env fallback or defaults
  const perTask = Number(process.env.PER_TASK_CAP_HOURS || PER_TASK_CAP);
  const daily = Number(process.env.DAILY_CAP_HOURS || DAILY_CAP);
  return { perTask, daily };
}

function validateTaskInput(data: {
  category?: unknown;
  title?: unknown;
  level?: unknown;
  durationHours?: unknown;
  date?: unknown;
}) {
  const { category, title, level, durationHours, date } = data;
  if (category !== "hustle" && category !== "humble") {
    throw new HttpsError("invalid-argument", "category must be hustle or humble");
  }
  if (typeof title !== "string" || title.trim().length === 0 || title.trim().length > 100) {
    throw new HttpsError("invalid-argument", "title must be 1-100 chars");
  }
  if (!Number.isInteger(level) || (level as number) < 1 || (level as number) > 5) {
    throw new HttpsError("invalid-argument", "level must be integer 1-5");
  }
  if (typeof durationHours !== "number" || (durationHours as number) <= 0) {
    throw new HttpsError("invalid-argument", "durationHours must be > 0");
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date as string)) {
    throw new HttpsError("invalid-argument", "date must be YYYY-MM-DD");
  }
  const d = new Date(date as string + "T00:00:00Z");
  if (isNaN(d.getTime())) throw new HttpsError("invalid-argument", "invalid date");
  // Not in past (UTC comparison, allow today)
  const todayStr = new Date().toISOString().slice(0, 10);
  if ((date as string) < todayStr) {
    throw new HttpsError("invalid-argument", "date cannot be in the past");
  }
}

export const createTask = onCall(async (request) => {
  enforceAppCheck(request);
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  const uid = request.auth.uid;
  const input = request.data as {
    category: "hustle" | "humble";
    title: string;
    level: number;
    durationHours: number;
    date: string;
  };

  validateTaskInput(input);
  const { perTask, daily } = getCapHours();

  if (input.durationHours > perTask) {
    throw new HttpsError("failed-precondition", `durationHours exceeds per-task cap ${perTask}h`);
  }

  const tasksCol = db.collection(`users/${uid}/tasks`);
  const q = tasksCol.where("date", "==", input.date);

  // Use transaction to avoid race
  let newTaskId = "";
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(q);
    let total = 0;
    snap.forEach((doc) => {
      const d = doc.data() as { durationHours?: number };
      total += d.durationHours || 0;
    });
    if (total + input.durationHours > daily) {
      const remaining = Math.max(0, daily - total);
      throw new HttpsError(
        "failed-precondition",
        `Daily cap ${daily}h exceeded. Remaining for ${input.date}: ${remaining.toFixed(2)}h (current total ${total}h)`
      );
    }
    const ref = tasksCol.doc(); // auto Firestore ID per decision
    newTaskId = ref.id;
    tx.set(ref, {
      category: input.category,
      title: input.title.trim(),
      level: input.level,
      durationHours: input.durationHours,
      date: input.date,
      status: "pending",
      score: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      completedAt: null,
      missedAt: null,
    });
  });

  return { taskId: newTaskId, status: "pending" };
});

export const updateTask = onCall(async (request) => {
  enforceAppCheck(request);
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  const uid = request.auth.uid;
  const { taskId, updates } = request.data as {
    taskId: string;
    updates: Partial<{ title: string; level: number; durationHours: number; date: string; category: "hustle" | "humble" }>;
  };
  if (!taskId || typeof taskId !== "string") throw new HttpsError("invalid-argument", "taskId required");
  if (!updates || typeof updates !== "object" || Object.keys(updates).length === 0) {
    throw new HttpsError("invalid-argument", "updates required");
  }

  const ref = db.doc(`users/${uid}/tasks/${taskId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Task not found");
  const existing = snap.data() as {
    status: string;
    durationHours: number;
    date: string;
    level: number;
    title: string;
    category: string;
  };
  if (existing.status !== "pending") {
    throw new HttpsError("failed-precondition", "Only pending tasks can be edited");
  }

  const patched: Record<string, unknown> = {};
  if (updates.title !== undefined) {
    if (typeof updates.title !== "string" || updates.title.trim().length === 0 || updates.title.trim().length > 100) {
      throw new HttpsError("invalid-argument", "title must be 1-100 chars");
    }
    patched["title"] = updates.title.trim();
  }
  if (updates.level !== undefined) {
    if (!Number.isInteger(updates.level) || updates.level < 1 || updates.level > 5) {
      throw new HttpsError("invalid-argument", "level must be 1-5");
    }
    patched["level"] = updates.level;
  }
  if (updates.durationHours !== undefined) {
    if (typeof updates.durationHours !== "number" || updates.durationHours <= 0) {
      throw new HttpsError("invalid-argument", "durationHours must be >0");
    }
    const { perTask } = getCapHours();
    if (updates.durationHours > perTask) throw new HttpsError("failed-precondition", `duration exceeds per-task cap ${perTask}h`);
    patched["durationHours"] = updates.durationHours;
  }
  if (updates.date !== undefined) {
    if (typeof updates.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(updates.date)) {
      throw new HttpsError("invalid-argument", "date must be YYYY-MM-DD");
    }
    const d = new Date(updates.date + "T00:00:00Z");
    if (isNaN(d.getTime())) throw new HttpsError("invalid-argument", "invalid date");
    const todayStr = new Date().toISOString().slice(0, 10);
    if (updates.date < todayStr) throw new HttpsError("invalid-argument", "date cannot be in past");
    patched["date"] = updates.date;
  }
  if (updates.category !== undefined) {
    if (updates.category !== "hustle" && updates.category !== "humble") {
      throw new HttpsError("invalid-argument", "category must be hustle or humble");
    }
    patched["category"] = updates.category;
  }

  // If duration or date changed, re-validate daily cap for target date
  const newDuration = (patched["durationHours"] as number | undefined) ?? existing.durationHours;
  const newDate = (patched["date"] as string | undefined) ?? existing.date;

  if (patched["durationHours"] !== undefined || patched["date"] !== undefined) {
    const { daily } = getCapHours();
    await db.runTransaction(async (tx) => {
      const q = db.collection(`users/${uid}/tasks`).where("date", "==", newDate);
      const snapQ = await tx.get(q);
      let total = 0;
      snapQ.forEach((doc) => {
        if (doc.id === taskId) return; // exclude current task old value
        const d = doc.data() as { durationHours?: number };
        total += d.durationHours || 0;
      });
      if (total + newDuration > daily) {
        const remaining = Math.max(0, daily - total);
        throw new HttpsError(
          "failed-precondition",
          `Daily cap ${daily}h exceeded for ${newDate}. Remaining: ${remaining.toFixed(2)}h`
        );
      }
      tx.update(ref, patched);
    });
  } else {
    await ref.update(patched);
  }

  return { taskId, updated: true };
});

export const deleteTask = onCall(async (request) => {
  enforceAppCheck(request);
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  const uid = request.auth.uid;
  const { taskId } = request.data as { taskId: string };
  if (!taskId) throw new HttpsError("invalid-argument", "taskId required");
  const ref = db.doc(`users/${uid}/tasks/${taskId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Task not found");
  const data = snap.data() as { status: string };
  if (data.status !== "pending") throw new HttpsError("failed-precondition", "Only pending tasks can be deleted");
  await ref.delete();
  return { taskId, deleted: true };
});

export const completeTask = onCall(async (request) => {
  enforceAppCheck(request);
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  const uid = request.auth.uid;
  const { taskId } = request.data as { taskId: string };
  if (!taskId) throw new HttpsError("invalid-argument", "taskId required");
  const ref = db.doc(`users/${uid}/tasks/${taskId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Task not found");
  const data = snap.data() as { status: string; level: number; durationHours: number };
  if (data.status !== "pending") throw new HttpsError("failed-precondition", "Task already completed or missed");
  const score = data.level * data.durationHours;
  await ref.update({
    status: "completed",
    score,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { taskId, status: "completed", score };
});
