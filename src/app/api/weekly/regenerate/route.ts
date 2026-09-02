export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { verifyAuth, mapError } from "@/lib/server/auth";
import { generateAiSuggestion, buildWeeklySummary } from "@/lib/server/aiSuggestion";
import { getRemoteConfig } from "@/lib/server/remoteConfig";

const COOLDOWN_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);
    const { weekId } = (await req.json()) as { weekId?: string };
    if (!weekId || typeof weekId !== "string" || !/^\d{4}-W\d{2}$/.test(weekId)) throw { status: 400, code: "invalid-argument", message: "weekId required as YYYY-Www" };

    const db = getAdminFirestore();
    const userRef = db.doc(`users/${uid}`);
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw { status: 404, code: "not-found", message: "User not found" };
    const userData = userSnap.data() as { aiReportEnabled?: boolean };
    if (userData.aiReportEnabled === false) throw { status: 400, code: "failed-precondition", message: "Enable AI report in profile first" };

    const remote = getRemoteConfig();
    if (!remote.aiReportEnabled) throw { status: 400, code: "failed-precondition", message: "AI reports disabled globally" };

    const reportRef = db.doc(`users/${uid}/weeklyReports/${weekId}`);
    const reportSnap = await reportRef.get();
    if (!reportSnap.exists) throw { status: 404, code: "not-found", message: "Weekly report not found for this weekId" };

    const report = reportSnap.data() as {
      aiSuggestion?: string | null;
      lastAiRegeneratedAt?: { toMillis: () => number } & Record<string, unknown>;
      hustleScore: number;
      humbleScore: number;
      totalScore: number;
      balanceIndex: number;
      completionRate: number;
      completedTasksCount: number;
      missedTasksCount: number;
    };

    if (report.lastAiRegeneratedAt) {
      const last = report.lastAiRegeneratedAt.toMillis();
      const now = Date.now();
      if (now - last < COOLDOWN_MS) {
        const waitSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
        throw { status: 429, code: "resource-exhausted", message: `Cooldown active, wait ${waitSec}s` };
      }
    }

    const humblePercentage = report.totalScore > 0 ? (report.humbleScore / report.totalScore) * 100 : 0;
    const summary = buildWeeklySummary({
      hustleScore: report.hustleScore,
      humbleScore: report.humbleScore,
      totalScore: report.totalScore,
      balanceIndex: report.balanceIndex,
      humblePercentage,
      completionRate: report.completionRate,
      completed: report.completedTasksCount,
      missed: report.missedTasksCount,
    });

    const ai = await generateAiSuggestion(summary);
    if (!ai) throw { status: 503, code: "unavailable", message: "AI generation failed, try again later" };

    await reportRef.update({
      aiSuggestion: ai,
      lastAiRegeneratedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ weekId, aiSuggestion: ai });
  } catch (e) {
    const { status, body } = mapError(e);
    console.error("[api/weekly/regenerate] error", e);
    return NextResponse.json(body, { status });
  }
}
