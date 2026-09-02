export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getTodayStrInTimezone } from "@/lib/server/time";

function verifyCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return; // allow in dev without secret
  const header = req.headers.get("authorization") || req.headers.get("x-cron-secret") || "";
  const token = header.replace("Bearer ", "").trim();
  if (token !== secret) throw { status: 401, code: "unauthenticated", message: "Invalid cron secret" };
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest) {
  try {
    verifyCron(req);
    const db = getAdminFirestore();
    const now = new Date();
    const currentHour = now.getUTCHours();
    const usersSnap = await db.collection("users").where("utcResetHour", "==", currentHour).get();
    if (usersSnap.empty) return NextResponse.json({ ok: true, hour: currentHour, missed: 0 });

    let totalMissed = 0;
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data() as { timezone?: string };
      const timezone = userData.timezone || "Asia/Jakarta";
      let todayLocal: string;
      try {
        todayLocal = getTodayStrInTimezone(timezone);
      } catch {
        continue;
      }
      const tasksRef = db.collection(`users/${userDoc.id}/tasks`);
      const pendingSnap = await tasksRef.where("status", "==", "pending").get();
      if (pendingSnap.empty) continue;
      const batch = db.batch();
      let batchCount = 0;
      for (const taskDoc of pendingSnap.docs) {
        const taskData = taskDoc.data() as { date?: string; status?: string };
        if (!taskData.date || taskData.date >= todayLocal) continue;
        if (taskData.status !== "pending") continue;
        batch.update(taskDoc.ref, { status: "missed", missedAt: FieldValue.serverTimestamp() });
        batchCount++;
        totalMissed++;
        if (batchCount >= 400) {
          await batch.commit();
          batchCount = 0;
        }
      }
      if (batchCount > 0) await batch.commit();
    }
    return NextResponse.json({ ok: true, hour: currentHour, missed: totalMissed });
  } catch (e) {
    const any = e as { status?: number; message?: string };
    console.error("[cron/taskCutover] error", e);
    return NextResponse.json({ error: any.message || "Internal" }, { status: any.status || 500 });
  }
}
