import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = admin.firestore();

function getTodayStrInTimezone(timezone: string): string {
  // Returns YYYY-MM-DD in given timezone
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // en-CA gives YYYY-MM-DD
}

/**
 * Hourly job: transition pending tasks where date < today (in user's local timezone) to missed.
 * Filters users where utcResetHour == current UTC hour to avoid scanning all users.
 * Idempotent: only updates status == pending.
 */
export const taskCutoverJob = onSchedule("every hour", async () => {
  const now = new Date();
  const currentHour = now.getUTCHours();
  logger.info(`[taskCutover] running for UTC hour ${currentHour}`);

  const usersSnap = await db.collection("users").where("utcResetHour", "==", currentHour).get();
  if (usersSnap.empty) {
    logger.info("[taskCutover] no users for this hour");
    return;
  }

  let totalMissed = 0;
  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data() as { timezone?: string };
    const timezone = userData.timezone || "Asia/Jakarta";
    let todayLocal: string;
    try {
      todayLocal = getTodayStrInTimezone(timezone);
    } catch (e) {
      logger.warn(`[taskCutover] invalid timezone ${timezone} for ${userDoc.id}`, e);
      continue;
    }

    const tasksRef = db.collection(`users/${userDoc.id}/tasks`);
    const pendingSnap = await tasksRef.where("status", "==", "pending").get();
    if (pendingSnap.empty) continue;

    const batch = db.batch();
    let batchCount = 0;
    for (const taskDoc of pendingSnap.docs) {
      const taskData = taskDoc.data() as { date?: string; status?: string };
      if (!taskData.date || taskData.date >= todayLocal) continue; // only past dates
      if (taskData.status !== "pending") continue;
      batch.update(taskDoc.ref, {
        status: "missed",
        missedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batchCount++;
      totalMissed++;
      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
    }
    if (batchCount > 0) await batch.commit();
    if (batchCount > 0 || pendingSnap.size > 0) {
      logger.info(`[taskCutover] user ${userDoc.id} (${timezone}) today ${todayLocal}: missed ${batchCount} tasks`);
    }
  }
  logger.info(`[taskCutover] done, total missed: ${totalMissed}`);
});
