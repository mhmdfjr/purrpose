import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { generateAiSuggestion, buildWeeklySummary } from "../services/aiSuggestion";
import { getRemoteConfig } from "../services/remoteConfig";
import { enforceAppCheck } from "../utils/appCheck";

const db = admin.firestore();

// Cooldown 1 hour per user per API.md 7
const COOLDOWN_MS = 60 * 60 * 1000;

export const regenerateWeeklySuggestion = onCall(async (request) => {
  enforceAppCheck(request);
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  const uid = request.auth.uid;
  const { weekId } = request.data as { weekId?: string };
  if (!weekId || typeof weekId !== "string" || !/^\d{4}-W\d{2}$/.test(weekId)) {
    throw new HttpsError("invalid-argument", "weekId required as YYYY-Www");
  }

  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) throw new HttpsError("not-found", "User not found");
  const userData = userSnap.data() as { aiReportEnabled?: boolean };
  if (userData.aiReportEnabled === false) {
    throw new HttpsError("failed-precondition", "Enable AI report in profile first");
  }

  const remote = getRemoteConfig();
  if (!remote.aiReportEnabled) {
    throw new HttpsError("failed-precondition", "AI reports disabled globally");
  }

  const reportRef = db.doc(`users/${uid}/weeklyReports/${weekId}`);
  const reportSnap = await reportRef.get();
  if (!reportSnap.exists) throw new HttpsError("not-found", "Weekly report not found for this weekId");

  const report = reportSnap.data() as {
    aiSuggestion?: string | null;
    lastAiRegeneratedAt?: admin.firestore.Timestamp;
    hustleScore: number;
    humbleScore: number;
    totalScore: number;
    balanceIndex: number;
    completionRate: number;
    completedTasksCount: number;
    missedTasksCount: number;
  };

  // Cooldown check
  if (report.lastAiRegeneratedAt) {
    const last = report.lastAiRegeneratedAt.toMillis();
    const now = Date.now();
    if (now - last < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
      throw new HttpsError("resource-exhausted", `Cooldown active, wait ${waitSec}s`);
    }
  }

  // If already has cached aiSuggestion and user wants regenerate, we still regenerate (overwrite)
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
  if (!ai) {
    logger.warn(`[regenerateWeeklySuggestion] Gemini failed for ${uid} ${weekId}, keeping existing`);
    throw new HttpsError("unavailable", "AI generation failed, try again later");
  }

  await reportRef.update({
    aiSuggestion: ai,
    lastAiRegeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { weekId, aiSuggestion: ai };
});
