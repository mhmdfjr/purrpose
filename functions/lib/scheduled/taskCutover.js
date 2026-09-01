"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskCutoverJob = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const db = admin.firestore();
function getTodayStrInTimezone(timezone) {
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
exports.taskCutoverJob = (0, scheduler_1.onSchedule)("every hour", async () => {
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
        const userData = userDoc.data();
        const timezone = userData.timezone || "Asia/Jakarta";
        let todayLocal;
        try {
            todayLocal = getTodayStrInTimezone(timezone);
        }
        catch (e) {
            logger.warn(`[taskCutover] invalid timezone ${timezone} for ${userDoc.id}`, e);
            continue;
        }
        const tasksRef = db.collection(`users/${userDoc.id}/tasks`);
        const pendingSnap = await tasksRef.where("status", "==", "pending").get();
        if (pendingSnap.empty)
            continue;
        const batch = db.batch();
        let batchCount = 0;
        for (const taskDoc of pendingSnap.docs) {
            const taskData = taskDoc.data();
            if (!taskData.date || taskData.date >= todayLocal)
                continue; // only past dates
            if (taskData.status !== "pending")
                continue;
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
        if (batchCount > 0)
            await batch.commit();
        if (batchCount > 0 || pendingSnap.size > 0) {
            logger.info(`[taskCutover] user ${userDoc.id} (${timezone}) today ${todayLocal}: missed ${batchCount} tasks`);
        }
    }
    logger.info(`[taskCutover] done, total missed: ${totalMissed}`);
});
//# sourceMappingURL=taskCutover.js.map