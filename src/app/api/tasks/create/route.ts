export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { verifyAuth, mapError } from "@/lib/server/auth";
import { validateTaskInput, getCapHours } from "@/lib/server/taskValidation";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);
    const input = (await req.json()) as {
      category: "hustle" | "humble";
      title: string;
      level: number;
      durationHours: number;
      date: string;
    };

    validateTaskInput(input);
    const { perTask, daily } = getCapHours();
    if (input.durationHours > perTask) {
      throw { status: 400, code: "failed-precondition", message: `durationHours exceeds per-task cap ${perTask}h` };
    }

    const db = getAdminFirestore();
    const tasksCol = db.collection(`users/${uid}/tasks`);
    const q = tasksCol.where("date", "==", input.date);

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
        throw { status: 400, code: "failed-precondition", message: `Daily cap ${daily}h exceeded. Remaining for ${input.date}: ${remaining.toFixed(2)}h (current total ${total}h)` };
      }
      const ref = tasksCol.doc();
      newTaskId = ref.id;
      tx.set(ref, {
        category: input.category,
        title: input.title.trim(),
        level: input.level,
        durationHours: input.durationHours,
        date: input.date,
        status: "pending",
        score: null,
        createdAt: FieldValue.serverTimestamp(),
        completedAt: null,
        missedAt: null,
      });
    });

    return NextResponse.json({ taskId: newTaskId, status: "pending" });
  } catch (e) {
    const { status, body } = mapError(e);
    console.error("[api/tasks/create] error", e);
    return NextResponse.json(body, { status });
  }
}
