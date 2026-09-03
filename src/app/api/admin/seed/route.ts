export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getPreviousWeekId, getWeekRange, getISOWeekId } from "@/lib/server/time";
import { generateRuleBasedSuggestion } from "@/lib/server/reportSuggestion";
import { getRemoteConfig } from "@/lib/server/remoteConfig";

function verifyAdmin(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw { status: 500, code: "unavailable", message: "CRON_SECRET not set" };
  const header = req.headers.get("authorization") || req.headers.get("x-cron-secret") || "";
  const token = header.replace("Bearer ", "").trim() || new URL(req.url).searchParams.get("secret") || "";
  if (token !== secret) throw { status: 401, code: "unauthenticated", message: "Invalid seed secret" };
}

const FAKE_USERS: Array<{
  uid: string;
  displayName: string;
  email: string;
  city: string;
  province: string;
  avatarUrl: string | null;
}> = [
  // Jakarta (DKI Jakarta) — 8 users
  { uid: "fake-001", displayName: "Ayu • Hustle Queen", email: "fake01@purrpose.test", city: "Jakarta", province: "DKI Jakarta", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Ayu" },
  { uid: "fake-002", displayName: "Bima • Steady", email: "fake02@purrpose.test", city: "Jakarta", province: "DKI Jakarta", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Bima" },
  { uid: "fake-003", displayName: "Citra • Flow", email: "fake03@purrpose.test", city: "Jakarta", province: "DKI Jakarta", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Citra" },
  { uid: "fake-004", displayName: "Dito • Grind", email: "fake04@purrpose.test", city: "Jakarta", province: "DKI Jakarta", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Dito" },
  { uid: "fake-005", displayName: "Elsa • Balance", email: "fake05@purrpose.test", city: "Jakarta", province: "DKI Jakarta", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Elsa" },
  { uid: "fake-006", displayName: "Fajar • Focus", email: "fake06@purrpose.test", city: "Jakarta", province: "DKI Jakarta", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Fajar" },
  { uid: "fake-007", displayName: "Kiki • Vibes", email: "fake07@purrpose.test", city: "Jakarta", province: "DKI Jakarta", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Kiki" },
  { uid: "fake-008", displayName: "Lukman • Smart", email: "fake08@purrpose.test", city: "Jakarta", province: "DKI Jakarta", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Lukman" },
  // Semarang (Jawa Tengah) — 8 users
  { uid: "fake-009", displayName: "Gita • Calm", email: "fake09@purrpose.test", city: "Semarang", province: "Jawa Tengah", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Gita" },
  { uid: "fake-010", displayName: "Hadi • Sprint", email: "fake10@purrpose.test", city: "Semarang", province: "Jawa Tengah", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Hadi" },
  { uid: "fake-011", displayName: "Intan • Zen", email: "fake11@purrpose.test", city: "Semarang", province: "Jawa Tengah", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Intan" },
  { uid: "fake-012", displayName: "Jaka • Builder", email: "fake12@purrpose.test", city: "Semarang", province: "Jawa Tengah", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Jaka" },
  { uid: "fake-013", displayName: "Maya • Dreamer", email: "fake13@purrpose.test", city: "Semarang", province: "Jawa Tengah", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Maya" },
  { uid: "fake-014", displayName: "Nina • Glow", email: "fake14@purrpose.test", city: "Semarang", province: "Jawa Tengah", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Nina" },
  { uid: "fake-015", displayName: "Omar • Chill", email: "fake15@purrpose.test", city: "Semarang", province: "Jawa Tengah", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Omar" },
  { uid: "fake-016", displayName: "Putri • Spark", email: "fake16@purrpose.test", city: "Semarang", province: "Jawa Tengah", avatarUrl: "https://api.dicebear.com/7.x/lorelei/svg?seed=Putri" },
];

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomTasksForWeek(startDate: string, endDate: string) {
  // Generate 10-14 tasks across the week to have realistic scores
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days: string[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  const tasks: Array<{ category: "hustle" | "humble"; title: string; level: number; durationHours: number; date: string; status: "completed" | "missed"; score: number | null }> = [];
  const hustleTitles = ["Deep work", "Belajar Next.js", "Ngulik API", "Review PR", "Planning sprint"];
  const humbleTitles = ["Jalan santai", "Journaling", "Tidur 8 jam", "Meditasi", "Ngopi slow"];
  for (const day of days) {
    const perDay = randInt(1, 3);
    for (let i = 0; i < perDay; i++) {
      const cat: "hustle" | "humble" = Math.random() < 0.55 ? "hustle" : "humble";
      const titles = cat === "hustle" ? hustleTitles : humbleTitles;
      const title = titles[randInt(0, titles.length - 1)] + ` ${randInt(1, 99)}`;
      const level = randInt(2, 5);
      const durationHours = [0.5, 1, 1.5, 2, 2.5][randInt(0, 4)];
      const isCompleted = Math.random() < 0.85; // 85% completed
      const status = isCompleted ? "completed" : "missed";
      const score = isCompleted ? level * durationHours : null;
      tasks.push({ category: cat, title, level, durationHours, date: day, status, score });
    }
  }
  return tasks;
}

export async function POST(req: NextRequest) {
  try {
    verifyAdmin(req);
    const db = getAdminFirestore();
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const force = (body as { force?: boolean })?.force === true;

    const now = new Date();
    const weekId = getPreviousWeekId(now);
    const currentWeekId = getISOWeekId(now);
    const { startDate, endDate } = getWeekRange(weekId);
    const remote = getRemoteConfig();

    // Check existing fake users
    const existingFakeSnap = await db.collection("users").where("isFake", "==", true).get().catch(() => null);
    const alreadyCount = existingFakeSnap ? existingFakeSnap.size : 0;
    if (alreadyCount >= 16 && !force) {
      return NextResponse.json({ ok: true, message: "Already seeded", count: alreadyCount, weekId });
    }

    let createdUsers = 0;
    let createdTasks = 0;
    let createdReports = 0;

    for (const fu of FAKE_USERS) {
      const userRef = db.doc(`users/${fu.uid}`);
      const snap = await userRef.get();
      if (!snap.exists || force) {
        await userRef.set(
          {
            displayName: fu.displayName,
            email: fu.email,
            avatarUrl: fu.avatarUrl,
            city: fu.city,
            province: fu.province,
            cityManualOverride: false,
            timezone: "Asia/Jakarta",
            utcResetHour: 17,
            aiReportEnabled: true,
            isFake: true,
            currentGroupId: null,
            currentCycleId: null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        createdUsers++;
      }

      // Create tasks for week unless already have report
      const reportRef = db.doc(`users/${fu.uid}/weeklyReports/${weekId}`);
      const reportSnap = await reportRef.get();
      if (!reportSnap.exists || force) {
        const tasks = randomTasksForWeek(startDate, endDate);
        let hustleScore = 0;
        let humbleScore = 0;
        let completed = 0;
        let missed = 0;
        // Use batch for tasks
        let batch = db.batch();
        let op = 0;
        const flush = async () => {
          if (op > 0) await batch.commit();
          batch = db.batch();
          op = 0;
        };
        for (let i = 0; i < tasks.length; i++) {
          const t = tasks[i];
          if (t.status === "completed") {
            completed++;
            if (t.category === "hustle") hustleScore += t.score || 0;
            else humbleScore += t.score || 0;
          } else missed++;
          const taskId = `seed-${weekId}-${i}`;
          const taskRef = db.doc(`users/${fu.uid}/tasks/${taskId}`);
          batch.set(taskRef, {
            category: t.category,
            title: t.title,
            level: t.level,
            durationHours: t.durationHours,
            date: t.date,
            status: t.status,
            score: t.score,
            createdAt: FieldValue.serverTimestamp(),
            ...(t.status === "completed" ? { completedAt: FieldValue.serverTimestamp() } : { missedAt: FieldValue.serverTimestamp() }),
          });
          op++;
          createdTasks++;
          if (op >= 400) await flush();
        }
        await flush();

        const totalScore = hustleScore + humbleScore;
        const humblePercentage = totalScore > 0 ? (humbleScore / totalScore) * 100 : 0;
        const balanceIndex = totalScore > 0 ? 100 - Math.abs(50 - humblePercentage) * 2 : 0;
        const completionRate = completed + missed > 0 ? completed / (completed + missed) : 0;
        const ruleBasedSuggestion = generateRuleBasedSuggestion({ humbleScore, hustleScore, totalScore, balanceIndex, humblePercentage, completionRate });

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
            aiSuggestion: null,
            generatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        createdReports++;

        // Also create a light report for current week (so fake users have some current activity)
        const curReportRef = db.doc(`users/${fu.uid}/weeklyReports/${currentWeekId}`);
        const curSnap = await curReportRef.get();
        if (!curSnap.exists) {
          const curRange = getWeekRange(currentWeekId);
          // 2-3 tasks for current week up to today
          const curTasks = randomTasksForWeek(curRange.startDate, todayStr());
          let ch = 0,
            cm = 0,
            chH = 0,
            chM = 0;
          for (const tt of curTasks.slice(0, 3)) {
            if (tt.status === "completed") {
              ch++;
              if (tt.category === "hustle") chH += tt.score || 0;
              else chM += tt.score || 0;
            } else cm++;
          }
          const curTotal = chH + chM;
          const curHumblePct = curTotal > 0 ? (chM / curTotal) * 100 : 0;
          const curBal = curTotal > 0 ? 100 - Math.abs(50 - curHumblePct) * 2 : 0;
          const curRate = ch + cm > 0 ? ch / (ch + cm) : 0;
          const curRule = generateRuleBasedSuggestion({ humbleScore: chM, hustleScore: chH, totalScore: curTotal, balanceIndex: curBal, humblePercentage: curHumblePct, completionRate: curRate });
          await curReportRef.set(
            {
              weekId: currentWeekId,
              startDate: curRange.startDate,
              endDate: curRange.endDate,
              hustleScore: chH,
              humbleScore: chM,
              totalScore: curTotal,
              balanceIndex: curBal,
              completedTasksCount: ch,
              missedTasksCount: cm,
              completionRate: curRate,
              ruleBasedSuggestion: curRule,
              aiSuggestion: null,
              generatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      }
    }

    function todayStr() {
      const d = new Date();
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    }

    // Create leaderboard cycle for previous week if not exists
    const cycleRef = db.doc(`leaderboardCycles/${weekId}`);
    const cycleSnap = await cycleRef.get();
    let leaderboardCreated = false;
    if (!cycleSnap.exists || force) {
      if (!cycleSnap.exists) {
        await cycleRef.set({ weekId, startDate, endDate, status: "matching", createdAt: FieldValue.serverTimestamp() });
      }
      // Build leaderboard entries for fake users based on their reports
      const leaderboardUsers: Array<{
        uid: string;
        city: string;
        province: string | null;
        displayName: string;
        avatarUrl: string | null;
        weeklyRawScore: number;
        balanceIndex: number;
        completionRate: number;
      }> = [];
      for (const fu of FAKE_USERS) {
        const repSnap = await db.doc(`users/${fu.uid}/weeklyReports/${weekId}`).get();
        if (!repSnap.exists) continue;
        const rep = repSnap.data() as { hustleScore: number; humbleScore: number; totalScore: number; balanceIndex: number; completionRate: number };
        leaderboardUsers.push({
          uid: fu.uid,
          city: fu.city,
          province: fu.province,
          displayName: fu.displayName,
          avatarUrl: fu.avatarUrl,
          weeklyRawScore: rep.totalScore,
          balanceIndex: rep.balanceIndex,
          completionRate: rep.completionRate,
        });
      }

      // Group fake users by city (city-level grouping: one group per city)
      const cityMap = new Map<string, typeof leaderboardUsers>();
      for (const u of leaderboardUsers) {
        const key = u.city.toLowerCase();
        if (!cityMap.has(key)) cityMap.set(key, []);
        cityMap.get(key)!.push(u);
      }

      let batch = db.batch();
      let op = 0;
      const flush = async () => {
        if (op > 0) await batch.commit();
        batch = db.batch();
        op = 0;
      };

      let groupIdx = 0;
      for (const [cityKey, cityUsers] of cityMap) {
        cityUsers.sort((a, b) => a.uid.localeCompare(b.uid));
        groupIdx++;
        const groupId = `g${groupIdx}-${cityKey.replace(/\s+/g, "-")}`;
        const groupRef = cycleRef.collection("groups").doc(groupId);
        const groupSnap = await groupRef.get();
        if (!(!groupSnap.exists || force)) continue;
        const locationName = cityUsers[0].city;
        await groupRef.set({ locationLevel: "city", locationName, memberCount: cityUsers.length, status: "pending" });
        const scored = cityUsers.map((u) => {
          const balanceWeight = remote.balanceWeightFloor + (u.balanceIndex / 100) * remote.balanceWeightRange;
          const completionWeight = remote.completionWeightFloor + u.completionRate * remote.completionWeightRange;
          const leaderboardScore = u.weeklyRawScore * balanceWeight * completionWeight;
          return { ...u, balanceWeight, completionWeight, leaderboardScore };
        });
        scored.sort((a, b) => b.leaderboardScore - a.leaderboardScore);

        for (let rankIdx = 0; rankIdx < scored.length; rankIdx++) {
          const u = scored[rankIdx];
          const rank = rankIdx + 1;
          const entryRef = groupRef.collection("entries").doc(u.uid);
          batch.set(entryRef, {
            userId: u.uid,
            weeklyRawScore: u.weeklyRawScore,
            balanceIndex: u.balanceIndex,
            completionRate: u.completionRate,
            balanceWeight: u.balanceWeight,
            completionWeight: u.completionWeight,
            leaderboardScore: u.leaderboardScore,
            rank,
          });
          op++;
          const userRef = db.doc(`users/${u.uid}`);
          batch.update(userRef, { currentGroupId: groupId, currentCycleId: weekId });
          op++;
          if (rank <= 3) {
            let tier: "gold" | "silver" | "bronze" = "bronze";
            if (rank === 1) tier = "gold";
            else if (rank === 2) tier = "silver";
            const badgeId = `${weekId}-${groupId}-${rank}`;
            const badgeRef = db.collection(`users/${u.uid}/badges`).doc(badgeId);
            batch.set(badgeRef, { tier, cycleId: weekId, groupId, locationName, awardedAt: FieldValue.serverTimestamp() });
            op++;
          }
          if (op >= 400) await flush();
        }
        await groupRef.update({ status: "scored" });
      }
      await flush();
      await cycleRef.update({ status: "completed" });
      leaderboardCreated = true;
    }

    return NextResponse.json({
      ok: true,
      weekId,
      currentWeekId,
      createdUsers,
      createdTasks,
      createdReports,
      leaderboardCreated,
      count: FAKE_USERS.length,
    });
  } catch (e) {
    const any = e as { status?: number; message?: string; code?: string };
    const status = any.status || 500;
    console.error("[admin/seed] error", e);
    return NextResponse.json({ error: any.message || "Internal", code: any.code }, { status });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
