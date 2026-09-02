export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { verifyAuth, mapError } from "@/lib/server/auth";
import { getCapHours } from "@/lib/server/taskValidation";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);
    const { taskId, updates } = (await req.json()) as {
      taskId: string;
      updates: Partial<{ title: string; level: number; durationHours: number; date: string; category: "hustle" | "humble" }>;
    };
    if (!taskId || typeof taskId !== "string") throw { status: 400, code: "invalid-argument", message: "taskId required" };
    if (!updates || typeof updates !== "object" || Object.keys(updates).length === 0) throw { status: 400, code: "invalid-argument", message: "updates required" };

    const db = getAdminFirestore();
    const ref = db.doc(`users/${uid}/tasks/${taskId}`);
    const snap = await ref.get();
    if (!snap.exists) throw { status: 404, code: "not-found", message: "Task not found" };
    const existing = snap.data() as { status: string; durationHours: number; date: string; level: number; title: string; category: string };
    if (existing.status !== "pending") throw { status: 400, code: "failed-precondition", message: "Only pending tasks can be edited" };

    const patched: Record<string, unknown> = {};
    if (updates.title !== undefined) {
      if (typeof updates.title !== "string" || updates.title.trim().length === 0 || updates.title.trim().length > 100) throw { status: 400, code: "invalid-argument", message: "title must be 1-100 chars" };
      patched["title"] = updates.title.trim();
    }
    if (updates.level !== undefined) {
      if (!Number.isInteger(updates.level) || updates.level < 1 || updates.level > 5) throw { status: 400, code: "invalid-argument", message: "level must be 1-5" };
      patched["level"] = updates.level;
    }
    if (updates.durationHours !== undefined) {
      if (typeof updates.durationHours !== "number" || updates.durationHours <= 0) throw { status: 400, code: "invalid-argument", message: "durationHours must be >0" };
      const { perTask } = getCapHours();
      if (updates.durationHours > perTask) throw { status: 400, code: "failed-precondition", message: `duration exceeds per-task cap ${perTask}h` };
      patched["durationHours"] = updates.durationHours;
    }
    if (updates.date !== undefined) {
      if (typeof updates.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(updates.date)) throw { status: 400, code: "invalid-argument", message: "date must be YYYY-MM-DD" };
      const d = new Date(updates.date + "T00:00:00Z");
      if (isNaN(d.getTime())) throw { status: 400, code: "invalid-argument", message: "invalid date" };
      const todayStr = new Date().toISOString().slice(0, 10);
      if (updates.date < todayStr) throw { status: 400, code: "invalid-argument", message: "date cannot be in past" };
      patched["date"] = updates.date;
    }
    if (updates.category !== undefined) {
      if (updates.category !== "hustle" && updates.category !== "humble") throw { status: 400, code: "invalid-argument", message: "category must be hustle or humble" };
      patched["category"] = updates.category;
    }

    const newDuration = (patched["durationHours"] as number | undefined) ?? existing.durationHours;
    const newDate = (patched["date"] as string | undefined) ?? existing.date;

    if (patched["durationHours"] !== undefined || patched["date"] !== undefined) {
      const { daily } = getCapHours();
      await db.runTransaction(async (tx) => {
        const q = db.collection(`users/${uid}/tasks`).where("date", "==", newDate);
        const snapQ = await tx.get(q);
        let total = 0;
        snapQ.forEach((doc) => {
          if (doc.id === taskId) return;
          const d = doc.data() as { durationHours?: number };
          total += d.durationHours || 0;
        });
        if (total + newDuration > daily) {
          const remaining = Math.max(0, daily - total);
          throw { status: 400, code: "failed-precondition", message: `Daily cap ${daily}h exceeded for ${newDate}. Remaining: ${remaining.toFixed(2)}h` };
        }
        tx.update(ref, patched);
      });
    } else {
      await ref.update(patched);
    }

    return NextResponse.json({ taskId, updated: true });
  } catch (e) {
    const { status, body } = mapError(e);
    console.error("[api/tasks/update] error", e);
    return NextResponse.json(body, { status });
  }
}
