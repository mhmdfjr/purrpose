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
exports.weeklyCycleJob = void 0;
exports.getISOWeekId = getISOWeekId;
exports.getWeekRange = getWeekRange;
exports.getPreviousWeekId = getPreviousWeekId;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const reportSuggestion_1 = require("../services/reportSuggestion");
const aiSuggestion_1 = require("../services/aiSuggestion");
const remoteConfig_1 = require("../services/remoteConfig");
const db = admin.firestore();
// Helpers for ISO week (Monday start) per PRD 7.2 & ARCHITECTURE 4.2 global UTC
function getISOWeekId(date) {
    // date is UTC
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = d.getUTCDay() || 7; // Mon=1..Sun=7
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
function getWeekRange(weekId) {
    // Parse YYYY-Www -> Monday and Sunday dates UTC
    const [yearStr, weekStr] = weekId.split("-W");
    const year = Number(yearStr);
    const week = Number(weekStr);
    // Jan 4 is always in week 1
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Day = jan4.getUTCDay() || 7;
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setUTCDate(jan4.getUTCDate() - (jan4Day - 1));
    const monday = new Date(mondayWeek1);
    monday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    return {
        startDate: monday.toISOString().slice(0, 10),
        endDate: sunday.toISOString().slice(0, 10),
    };
}
function getPreviousWeekId(now) {
    // weeklyCycleJob runs Monday 00:00 UTC -> report for week that just ended (previous week)
    const yesterday = new Date(now);
    yesterday.setUTCDate(now.getUTCDate() - 1); // Sunday
    return getISOWeekId(yesterday);
}
/**
 * Weekly cycle job — first half (M4): compute weeklyReports per user
 * Remaining leaderboard matching/badge is M6.
 */
exports.weeklyCycleJob = (0, scheduler_1.onSchedule)("0 0 * * 1", async () => {
    var _a, _b;
    const now = new Date();
    const weekId = getPreviousWeekId(now);
    const { startDate, endDate } = getWeekRange(weekId);
    logger.info(`[weeklyCycle] Generating weeklyReports for ${weekId} (${startDate}..${endDate})`);
    const usersSnap = await db.collection("users").get();
    if (usersSnap.empty) {
        logger.info("[weeklyCycle] no users");
        return;
    }
    let processed = 0;
    // Collect data for leaderboard (M6) — need per-user weekly scores, city/province
    const leaderboardUsers = [];
    for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        const userData = userDoc.data();
        try {
            const tasksRef = db.collection(`users/${uid}/tasks`);
            // Query tasks in week range where status completed or missed
            // Since date is string YYYY-MM-DD, range query works
            const snap = await tasksRef.where("date", ">=", startDate).where("date", "<=", endDate).get();
            let hustleScore = 0;
            let humbleScore = 0;
            let completed = 0;
            let missed = 0;
            snap.forEach((doc) => {
                const t = doc.data();
                if (t.status === "completed") {
                    completed++;
                    const s = t.score || 0;
                    if (t.category === "hustle")
                        hustleScore += s;
                    else if (t.category === "humble")
                        humbleScore += s;
                }
                else if (t.status === "missed") {
                    missed++;
                }
            });
            const totalScore = hustleScore + humbleScore;
            const humblePercentage = totalScore > 0 ? (humbleScore / totalScore) * 100 : 0;
            const balanceIndex = totalScore > 0 ? 100 - Math.abs(50 - humblePercentage) * 2 : 0;
            const completionRate = completed + missed > 0 ? completed / (completed + missed) : 0;
            const ruleBasedSuggestion = (0, reportSuggestion_1.generateRuleBasedSuggestion)({
                humbleScore,
                hustleScore,
                totalScore,
                balanceIndex,
                humblePercentage,
                completionRate,
            });
            const reportRef = db.doc(`users/${uid}/weeklyReports/${weekId}`);
            // Check existing report to avoid regenerating AI if already cached (generate once per user decision)
            const existingSnap = await reportRef.get();
            const existingAi = existingSnap.exists ? (_a = existingSnap.data()) === null || _a === void 0 ? void 0 : _a.aiSuggestion : null;
            let aiSuggestion = existingAi !== null && existingAi !== void 0 ? existingAi : null;
            const remote = (0, remoteConfig_1.getRemoteConfig)();
            const shouldGenerateAI = remote.aiReportEnabled && userData.aiReportEnabled !== false && !aiSuggestion;
            if (shouldGenerateAI) {
                const summary = (0, aiSuggestion_1.buildWeeklySummary)({
                    hustleScore,
                    humbleScore,
                    totalScore,
                    balanceIndex,
                    humblePercentage,
                    completionRate,
                    completed,
                    missed,
                });
                const ai = await (0, aiSuggestion_1.generateAiSuggestion)(summary);
                if (ai)
                    aiSuggestion = ai;
                // If ai is null (timeout/error/quota), keep null → UI shows ruleBased only, fallback per ARCHITECTURE 4.4
            }
            await reportRef.set({
                weekId,
                startDate,
                endDate,
                hustleScore,
                humbleScore,
                totalScore,
                balanceIndex,
                completedTasksCount: completed,
                missedTasksCount: missed,
                completionRate,
                ruleBasedSuggestion,
                aiSuggestion,
                generatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            leaderboardUsers.push({
                uid,
                city: userData.city || "Unknown",
                province: userData.province || null,
                displayName: userData.displayName || "User",
                avatarUrl: userData.avatarUrl || null,
                weeklyRawScore: totalScore,
                balanceIndex,
                completionRate,
                hustleScore,
                humbleScore,
            });
            processed++;
            if (processed % 100 === 0)
                logger.info(`[weeklyCycle] processed ${processed}/${usersSnap.size}`);
        }
        catch (e) {
            logger.error(`[weeklyCycle] failed for user ${uid}`, e);
            // Continue to next user — graceful degradation
        }
    }
    logger.info(`[weeklyCycle] reports done week ${weekId} for ${processed} users`);
    // === M6 Leaderboard matching & badges — idempotent with checkpoint per ARCHITECTURE 12 / M7 ===
    try {
        const GROUP_SIZE = 15; // 14 other + self per PRD 8.1 (ROADMAP says 14, we use 15 as spec)
        const cycleRef = db.doc(`leaderboardCycles/${weekId}`);
        const cycleSnap = await cycleRef.get();
        const existingStatus = cycleSnap.exists ? (_b = cycleSnap.data()) === null || _b === void 0 ? void 0 : _b.status : null;
        if (existingStatus === "completed") {
            logger.info(`[weeklyCycle] leaderboard already completed for ${weekId}, skipping (idempotent)`);
        }
        else {
            // Create cycle if not exists; preserve scoring status for resume (don't downgrade)
            if (!cycleSnap.exists) {
                await cycleRef.set({
                    weekId,
                    startDate,
                    endDate,
                    status: "matching",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
            }
            else if (existingStatus !== "scoring") {
                await cycleRef.set({ status: "matching" }, { merge: true });
            }
            const remoteCfg = (0, remoteConfig_1.getRemoteConfig)();
            // Grouping
            const cityMap = new Map();
            for (const u of leaderboardUsers) {
                const key = (u.city || "Unknown").toLowerCase();
                if (!cityMap.has(key))
                    cityMap.set(key, []);
                cityMap.get(key).push(u);
            }
            const groups = [];
            const assigned = new Set();
            const leftovers = [];
            // Phase 1: city-level full groups
            for (const [, users] of cityMap) {
                // Sort for determinism
                users.sort((a, b) => a.uid.localeCompare(b.uid));
                let idx = 0;
                while (idx + GROUP_SIZE <= users.length) {
                    const chunk = users.slice(idx, idx + GROUP_SIZE);
                    groups.push({ members: chunk, locationLevel: "city", locationName: chunk[0].city });
                    chunk.forEach((u) => assigned.add(u.uid));
                    idx += GROUP_SIZE;
                }
                // remainder -> leftovers
                for (let i = idx; i < users.length; i++)
                    leftovers.push(users[i]);
            }
            // Phase 2: province fallback for leftovers
            if (leftovers.length > 0) {
                const provinceMap = new Map();
                for (const u of leftovers) {
                    const provKey = (u.province || u.city || "Unknown").toLowerCase();
                    if (!provinceMap.has(provKey))
                        provinceMap.set(provKey, []);
                    provinceMap.get(provKey).push(u);
                }
                for (const [, users] of provinceMap) {
                    users.sort((a, b) => a.uid.localeCompare(b.uid));
                    let idx = 0;
                    while (idx + GROUP_SIZE <= users.length) {
                        const chunk = users.slice(idx, idx + GROUP_SIZE);
                        groups.push({ members: chunk, locationLevel: "province", locationName: chunk[0].province || chunk[0].city });
                        chunk.forEach((u) => assigned.add(u.uid));
                        idx += GROUP_SIZE;
                    }
                }
                // Collect any leftover that were not assigned in province chunking (those that were in leftovers but not assigned)
                const provinceLeftovers = leftovers.filter((u) => !assigned.has(u.uid));
                // Group province leftovers by province into small groups (each province one group)
                const provGroups = new Map();
                for (const u of provinceLeftovers) {
                    const provKey = (u.province || u.city || "Unknown").toLowerCase();
                    if (!provGroups.has(provKey))
                        provGroups.set(provKey, []);
                    provGroups.get(provKey).push(u);
                }
                for (const [, users] of provGroups) {
                    // If users from same province < GROUP_SIZE, keep as small group (fallback final per PRD 8.2 step 3)
                    groups.push({ members: users, locationLevel: "province", locationName: users[0].province || users[0].city });
                    users.forEach((u) => assigned.add(u.uid));
                }
            }
            // Edge: if no groups formed but have users (e.g., all leftovers were province grouped), ensure at least one group
            if (groups.length === 0 && leaderboardUsers.length > 0) {
                groups.push({ members: leaderboardUsers, locationLevel: "city", locationName: leaderboardUsers[0].city });
            }
            logger.info(`[weeklyCycle] forming ${groups.length} groups for ${leaderboardUsers.length} users`);
            // Idempotency: fetch existing groups to skip already scored groups on resume
            const existingGroupsSnap = await cycleRef.collection("groups").get();
            const existingGroups = new Map();
            existingGroupsSnap.forEach((d) => { var _a; return existingGroups.set(d.id, ((_a = d.data()) === null || _a === void 0 ? void 0 : _a.status) || "pending"); });
            // Update cycle to scoring (idempotent)
            await cycleRef.set({ status: "scoring" }, { merge: true });
            // For each group, compute leaderboardScore, rank, write entries + badges + currentGroupId
            for (let gi = 0; gi < groups.length; gi++) {
                const g = groups[gi];
                const groupId = `g${gi + 1}-${g.locationName.replace(/\s+/g, "-").toLowerCase()}`;
                if (existingGroups.get(groupId) === "scored") {
                    logger.info(`[weeklyCycle] skip group ${groupId} already scored (resume)`);
                    continue;
                }
                const groupRef = cycleRef.collection("groups").doc(groupId);
                await groupRef.set({
                    locationLevel: g.locationLevel,
                    locationName: g.locationName,
                    memberCount: g.members.length,
                    status: "pending",
                });
                // Compute scores
                const scored = g.members.map((u) => {
                    const balanceWeight = remoteCfg.balanceWeightFloor + (u.balanceIndex / 100) * remoteCfg.balanceWeightRange;
                    const completionWeight = remoteCfg.completionWeightFloor + u.completionRate * remoteCfg.completionWeightRange;
                    const leaderboardScore = u.weeklyRawScore * balanceWeight * completionWeight;
                    return Object.assign(Object.assign({}, u), { balanceWeight, completionWeight, leaderboardScore });
                });
                scored.sort((a, b) => b.leaderboardScore - a.leaderboardScore);
                // Batch writes for entries
                let batch = db.batch();
                let opCount = 0;
                const flush = async () => {
                    if (opCount > 0)
                        await batch.commit();
                    batch = db.batch();
                    opCount = 0;
                };
                for (let rankIdx = 0; rankIdx < scored.length; rankIdx++) {
                    const u = scored[rankIdx];
                    const rank = rankIdx + 1;
                    const entryRef = groupRef.collection("entries").doc(u.uid);
                    batch.set(entryRef, {
                        userId: u.uid,
                        displayName: u.displayName,
                        avatarUrl: u.avatarUrl,
                        city: u.city,
                        weeklyRawScore: u.weeklyRawScore,
                        balanceIndex: u.balanceIndex,
                        completionRate: u.completionRate,
                        balanceWeight: u.balanceWeight,
                        completionWeight: u.completionWeight,
                        leaderboardScore: u.leaderboardScore,
                        rank,
                    });
                    opCount++;
                    // Update user's currentGroupId + currentCycleId (denormalized per DATABASE 3)
                    const userRef = db.doc(`users/${u.uid}`);
                    batch.update(userRef, { currentGroupId: groupId, currentCycleId: weekId });
                    opCount++;
                    // Badge for top 3
                    if (rank <= 3) {
                        let tier = "bronze";
                        if (rank === 1)
                            tier = "gold";
                        else if (rank === 2)
                            tier = "silver";
                        const badgeId = `${weekId}-${groupId}-${rank}`;
                        const badgeRef = db.collection(`users/${u.uid}/badges`).doc(badgeId);
                        batch.set(badgeRef, {
                            tier,
                            cycleId: weekId,
                            groupId,
                            locationName: g.locationName,
                            awardedAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        opCount++;
                    }
                    if (opCount >= 400)
                        await flush();
                }
                await flush();
                // Mark group scored and update ranks? Entries already have rank
                await groupRef.update({ status: "scored" });
            }
            await cycleRef.update({ status: "completed" });
            logger.info(`[weeklyCycle] leaderboard completed for ${weekId}: ${groups.length} groups`);
        }
    }
    catch (e) {
        logger.error(`[weeklyCycle] leaderboard failed for ${weekId}`, e);
        // Don't throw to not fail whole job; reports already done
    }
    logger.info(`[weeklyCycle] done week ${weekId} for ${processed} users`);
});
//# sourceMappingURL=weeklyCycle.js.map