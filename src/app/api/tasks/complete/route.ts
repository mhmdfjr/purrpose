export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { verifyAuth, mapError } from "@/lib/server/auth";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);
    const { taskId } = (await req.json()) as { taskId: string };
    if (!taskId) throw { status: 400, code: "invalid-argument", message: "taskId required" };
    const db = getAdminFirestore();
    const ref = db.doc(`users/${uid}/tasks/${taskId}`);
    const snap = await ref.get();
    if (!snap.exists) throw { status: 404, code: "not-found", message: "Task not found" };
    const data = snap.data() as { status: string; level: number; durationHours: number };
    if (data.status !== "pending") throw { status: 400, code: "failed-precondition", message: "Task already completed or missed" };
    const score = data.level * data.durationHours;
    await ref.update({
      status: "completed",
      score,
      completedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ taskId, status: "completed", score });
  } catch (e) {
    const { status, body } = mapError(e);
    console.error("[api/tasks/complete] error", e);
    return NextResponse.json(body, { status });
  }
}
