export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getWeekRange, getPreviousWeekId } from "@/lib/server/time";
import { generateRuleBasedSuggestion } from "@/lib/server/reportSuggestion";
import { generateAiSuggestion, buildWeeklySummary } from "@/lib/server/aiSuggestion";
import { getRemoteConfig } from "@/lib/server/remoteConfig";

function verifyCron(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return;
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
    const weekId = getPreviousWeekId(now);
    const { startDate, endDate } = getWeekRange(weekId);

    const usersSnap = await db.collection("users").get();
    if (usersSnap.empty) return NextResponse.json({ ok: true, weekId, processed: 0 });

    let processed = 0;
    const leaderboardUsers: {
      uid: string;
      city: string;
      province: string | null;
      displayName: string;
      avatarUrl: string | null;
      weeklyRawScore: number;
      balanceIndex: number;
      completionRate: number;
      hustleScore: number;
      humbleScore: number;
    }[] = [];

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data() as { aiReportEnabled?: boolean; city?: string; province?: string; displayName?: string; avatarUrl?: string | null };
      try {
        const tasksRef = db.collection(`users/${uid}/tasks`);
        const snap = await tasksRef.where("date", ">=", startDate).where("date", "<=", endDate).get();
        let hustleScore = 0;
        let humbleScore = 0;
        let completed = 0;
        let missed = 0;
        snap.forEach((doc) => {
          const t = doc.data() as { category: string; score: number | null; status: string };
          if (t.status === "completed") {
            completed++;
            const s = t.score || 0;
            if (t.category === "hustle") hustleScore += s;
            else if (t.category === "humble") humbleScore += s;
          } else if (t.status === "missed") missed++;
        });
        const totalScore = hustleScore + humbleScore;
        const humblePercentage = totalScore > 0 ? (humbleScore / totalScore) * 100 : 0;
        const balanceIndex = totalScore > 0 ? 100 - Math.abs(50 - humblePercentage) * 2 : 0;
        const completionRate = completed + missed > 0 ? completed / (completed + missed) : 0;
        const ruleBasedSuggestion = generateRuleBasedSuggestion({ humbleScore, hustleScore, totalScore, balanceIndex, humblePercentage, completionRate });
        const reportRef = db.doc(`users/${uid}/weeklyReports/${weekId}`);
        const existingSnap = await reportRef.get();
        const existingAi = existingSnap.exists ? (existingSnap.data() as { aiSuggestion?: string | null })?.aiSuggestion : null;
        let aiSuggestion: string | null = existingAi ?? null;
        const remote = getRemoteConfig();
        const shouldGenerateAI = remote.aiReportEnabled && userData.aiReportEnabled !== false && !aiSuggestion;
        if (shouldGenerateAI) {
          const summary = buildWeeklySummary({ hustleScore, humbleScore, totalScore, balanceIndex, humblePercentage, completionRate, completed, missed });
          const ai = await generateAiSuggestion(summary);
          if (ai) aiSuggestion = ai;
        }
        await reportRef.set(
          {
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
            generatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        leaderboardUsers.push({ uid, city: userData.city || "Unknown", province: userData.province || null, displayName: userData.displayName || "User", avatarUrl: userData.avatarUrl || null, weeklyRawScore: totalScore, balanceIndex, completionRate, hustleScore, humbleScore });
        processed++;
      } catch (e) {
        console.error(`[cron/weekly] failed for ${uid}`, e);
      }
    }

    // Leaderboard matching (same as functions)
    const GROUP_SIZE = 15;
    const cycleRef = db.doc(`leaderboardCycles/${weekId}`);
    const cycleSnap = await cycleRef.get();
    const existingStatus = cycleSnap.exists ? (cycleSnap.data() as { status?: string })?.status : null;
    if (existingStatus === "completed") {
      return NextResponse.json({ ok: true, weekId, processed, leaderboard: "already completed" });
    }
    if (!cycleSnap.exists) {
      await cycleRef.set({ weekId, startDate, endDate, status: "matching", createdAt: FieldValue.serverTimestamp() }, { merge: true });
    } else if (existingStatus !== "scoring") {
      await cycleRef.set({ status: "matching" }, { merge: true });
    }
    const remoteCfg = getRemoteConfig();
    const cityMap = new Map<string, typeof leaderboardUsers>();
    for (const u of leaderboardUsers) {
      const key = (u.city || "Unknown").toLowerCase();
      if (!cityMap.has(key)) cityMap.set(key, []);
      cityMap.get(key)!.push(u);
    }
    type Group = { members: typeof leaderboardUsers; locationLevel: "city" | "province"; locationName: string };
    const groups: Group[] = [];
    const assigned = new Set<string>();
    const leftovers: typeof leaderboardUsers = [];
    for (const [, users] of cityMap) {
      users.sort((a, b) => a.uid.localeCompare(b.uid));
      let idx = 0;
      while (idx + GROUP_SIZE <= users.length) {
        const chunk = users.slice(idx, idx + GROUP_SIZE);
        groups.push({ members: chunk, locationLevel: "city", locationName: chunk[0].city });
        chunk.forEach((u) => assigned.add(u.uid));
        idx += GROUP_SIZE;
      }
      for (let i = idx; i < users.length; i++) leftovers.push(users[i]);
    }
    if (leftovers.length > 0) {
      const provinceMap = new Map<string, typeof leaderboardUsers>();
      for (const u of leftovers) {
        const provKey = (u.province || u.city || "Unknown").toLowerCase();
        if (!provinceMap.has(provKey)) provinceMap.set(provKey, []);
        provinceMap.get(provKey)!.push(u);
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
      const provinceLeftovers = leftovers.filter((u) => !assigned.has(u.uid));
      const provGroups = new Map<string, typeof leaderboardUsers>();
      for (const u of provinceLeftovers) {
        const provKey = (u.province || u.city || "Unknown").toLowerCase();
        if (!provGroups.has(provKey)) provGroups.set(provKey, []);
        provGroups.get(provKey)!.push(u);
      }
      for (const [, users] of provGroups) {
        groups.push({ members: users, locationLevel: "province", locationName: users[0].province || users[0].city });
        users.forEach((u) => assigned.add(u.uid));
      }
    }
    if (groups.length === 0 && leaderboardUsers.length > 0) groups.push({ members: leaderboardUsers, locationLevel: "city", locationName: leaderboardUsers[0].city });

    const existingGroupsSnap = await cycleRef.collection("groups").get();
    const existingGroups = new Map<string, string>();
    existingGroupsSnap.forEach((d) => existingGroups.set(d.id, (d.data() as { status?: string })?.status || "pending"));
    await cycleRef.set({ status: "scoring" }, { merge: true });

    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi];
      const groupId = `g${gi + 1}-${g.locationName.replace(/\s+/g, "-").toLowerCase()}`;
      if (existingGroups.get(groupId) === "scored") continue;
      const groupRef = cycleRef.collection("groups").doc(groupId);
      await groupRef.set({ locationLevel: g.locationLevel, locationName: g.locationName, memberCount: g.members.length, status: "pending" });
      const scored = g.members.map((u) => {
        const balanceWeight = remoteCfg.balanceWeightFloor + (u.balanceIndex / 100) * remoteCfg.balanceWeightRange;
        const completionWeight = remoteCfg.completionWeightFloor + u.completionRate * remoteCfg.completionWeightRange;
        const leaderboardScore = u.weeklyRawScore * balanceWeight * completionWeight;
        return { ...u, balanceWeight, completionWeight, leaderboardScore };
      });
      scored.sort((a, b) => b.leaderboardScore - a.leaderboardScore);
      let batch = db.batch();
      let opCount = 0;
      const flush = async () => {
        if (opCount > 0) await batch.commit();
        batch = db.batch();
        opCount = 0;
      };
      for (let rankIdx = 0; rankIdx < scored.length; rankIdx++) {
        const u = scored[rankIdx];
        const rank = rankIdx + 1;
        const entryRef = groupRef.collection("entries").doc(u.uid);
        batch.set(entryRef, { userId: u.uid, weeklyRawScore: u.weeklyRawScore, balanceIndex: u.balanceIndex, completionRate: u.completionRate, balanceWeight: u.balanceWeight, completionWeight: u.completionWeight, leaderboardScore: u.leaderboardScore, rank });
        opCount++;
        const userRef = db.doc(`users/${u.uid}`);
        batch.update(userRef, { currentGroupId: groupId, currentCycleId: weekId });
        opCount++;
        if (rank <= 3) {
          let tier: "gold" | "silver" | "bronze" = "bronze";
          if (rank === 1) tier = "gold";
          else if (rank === 2) tier = "silver";
          const badgeId = `${weekId}-${groupId}-${rank}`;
          const badgeRef = db.collection(`users/${u.uid}/badges`).doc(badgeId);
          batch.set(badgeRef, { tier, cycleId: weekId, groupId, locationName: g.locationName, awardedAt: FieldValue.serverTimestamp() });
          opCount++;
        }
        if (opCount >= 400) await flush();
      }
      await flush();
      await groupRef.update({ status: "scored" });
    }
    await cycleRef.update({ status: "completed" });

    return NextResponse.json({ ok: true, weekId, processed, groups: groups.length });
  } catch (e) {
    const any = e as { status?: number; message?: string };
    console.error("[cron/weekly] error", e);
    return NextResponse.json({ error: any.message || "Internal" }, { status: any.status || 500 });
  }
}
