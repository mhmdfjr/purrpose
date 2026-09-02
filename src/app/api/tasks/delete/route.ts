export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
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
    const data = snap.data() as { status: string };
    if (data.status !== "pending") throw { status: 400, code: "failed-precondition", message: "Only pending tasks can be deleted" };
    await ref.delete();
    return NextResponse.json({ taskId, deleted: true });
  } catch (e) {
    const { status, body } = mapError(e);
    console.error("[api/tasks/delete] error", e);
    return NextResponse.json(body, { status });
  }
}
