/**
 * One-off script: insert the 2 real users into the week 2026-W36 leaderboard.
 *
 * Mapping (already decided):
 *   moh.fajar1304@gmail.com              -> Jakarta   -> g1-jakarta
 *   mohfajar1343@students.unnes.ac.id    -> Semarang  -> g2-semarang
 *
 * Usage:
 *   npx tsx scripts/seed-real-users.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const WEEK_ID = "2026-W36";

const TARGETS: Array<{
  email: string;
  city: string;
  province: string;
  groupId: string;
}> = [
  {
    email: "moh.fajar1304@gmail.com",
    city: "Jakarta",
    province: "DKI Jakarta",
    groupId: "g1-jakarta",
  },
  {
    email: "mohfajar1343@students.unnes.ac.id",
    city: "Semarang",
    province: "Jawa Tengah",
    groupId: "g2-semarang",
  },
];

function loadAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0]!;

  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (saJson) {
    let jsonStr = saJson.trim();
    if (!jsonStr.startsWith("{")) {
      jsonStr = Buffer.from(jsonStr, "base64").toString("utf-8");
    }
    const serviceAccount = JSON.parse(jsonStr);
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  throw new Error("FIREBASE_SERVICE_ACCOUNT tidak ada di env. Set dulu di .env.local");
}

async function getCycleStartEnd(): Promise<{ startDate: string; endDate: string }> {
  const db = getFirestore();
  const cycleRef = db.doc(`leaderboardCycles/${WEEK_ID}`);
  const snap = await cycleRef.get();
  if (!snap.exists) throw new Error(`Cycle ${WEEK_ID} tidak ada di Firestore`);
  const data = snap.data()!;
  return { startDate: data.startDate as string, endDate: data.endDate as string };
}

async function main() {
  loadAdminApp();
  const db = getFirestore();
  const auth = getAuth();

  const { startDate, endDate } = await getCycleStartEnd();
  console.log(`Cycle ${WEEK_ID}: ${startDate} -> ${endDate}`);

  for (const t of TARGETS) {
    console.log(`\n=== ${t.email} -> ${t.city} (${t.groupId}) ===`);

    const userRec = await auth.getUserByEmail(t.email);
    const uid = userRec.uid;
    console.log(`  UID: ${uid}`);
    console.log(`  displayName: ${userRec.displayName ?? "(none)"}`);

    const userRef = db.doc(`users/${uid}`);

    // 1. Ensure user doc exists with correct city/province
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      const existing = userSnap.data() as Record<string, unknown>;
      if (existing.city !== t.city || existing.province !== t.province) {
        await userRef.update({ city: t.city, province: t.province, updatedAt: FieldValue.serverTimestamp() });
        console.log("  User doc diupdate: city/province diset.");
      } else {
        console.log("  User doc sudah punya city/province yang benar.");
      }
    } else {
      await userRef.set({
        displayName: userRec.displayName ?? "User",
        email: t.email,
        avatarUrl: userRec.photoURL ?? null,
        city: t.city,
        province: t.province,
        cityManualOverride: false,
        timezone: "Asia/Jakarta",
        utcResetHour: 17,
        aiReportEnabled: true,
        isFake: false,
        currentGroupId: null,
        currentCycleId: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log("  User doc dibuat.");
    }

    // 2. Ensure a weekly report (score 0) exists for the cycle
    const reportRef = db.doc(`users/${uid}/weeklyReports/${WEEK_ID}`);
    const reportSnap = await reportRef.get();
    if (!reportSnap.exists) {
      await reportRef.set({
        weekId: WEEK_ID,
        startDate,
        endDate,
        hustleScore: 0,
        humbleScore: 0,
        totalScore: 0,
        balanceIndex: 0,
        completedTasksCount: 0,
        missedTasksCount: 0,
        completionRate: 0,
        ruleBasedSuggestion: "Belum ada data minggu ini.",
        aiSuggestion: null,
        generatedAt: FieldValue.serverTimestamp(),
      });
      console.log("  Weekly report (score 0) dibuat.");
    } else {
      console.log("  Weekly report sudah ada.");
    }

    // 3. Insert entry into the group if absent
    const groupRef = db.doc(`leaderboardCycles/${WEEK_ID}/groups/${t.groupId}`);
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) throw new Error(`Group ${t.groupId} tidak ada`);

    const groupData = groupSnap.data()!;
    const memberCount = (groupData.memberCount as number) || 0;
    const nextRank = memberCount + 1;

    const entryRef = groupRef.collection("entries").doc(uid);
    const entrySnap = await entryRef.get();
    if (!entrySnap.exists) {
      await entryRef.set({
        userId: uid,
        weeklyRawScore: 0,
        balanceIndex: 0,
        completionRate: 0,
        balanceWeight: 0.5,
        completionWeight: 0.5,
        leaderboardScore: 0,
        rank: nextRank,
      });
      console.log(`  Entry dibuat di ${t.groupId}, rank=${nextRank}`);
    } else {
      console.log(`  Entry sudah ada di ${t.groupId}`);
    }

    // 4. Denormalize group/cycle on user
    await userRef.update({ currentGroupId: t.groupId, currentCycleId: WEEK_ID });
    console.log("  currentGroupId/currentCycleId diset.");

    // 5. Bump memberCount on the group
    await groupRef.update({ memberCount: memberCount + 1 });
    console.log(`  memberCount ${t.groupId}: ${memberCount} -> ${memberCount + 1}`);
  }

  console.log("\nSelesai. Buka /leaderboard untuk cek hasilnya.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
