/**
 * One-off backfill: add denormalized displayName/avatarUrl/city to all
 * existing leaderboard entries in cycle 2026-W36.
 *
 * Reads each entry's users/{uid} doc via Admin SDK and merges the 3 fields.
 *
 * Usage:
 *   npx tsx scripts/backfill-entry-profiles.ts
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const WEEK_ID = "2026-W36";

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

  throw new Error("FIREBASE_SERVICE_ACCOUNT tidak ada di env");
}

async function main() {
  loadAdminApp();
  const db = getFirestore();

  const cycleRef = db.doc(`leaderboardCycles/${WEEK_ID}`);
  const cycleSnap = await cycleRef.get();
  if (!cycleSnap.exists) throw new Error(`Cycle ${WEEK_ID} tidak ada`);

  const groupsSnap = await cycleRef.collection("groups").get();
  console.log(`Ditemukan ${groupsSnap.size} grup di cycle ${WEEK_ID}`);

  let updated = 0;
  let skipped = 0;

  for (const gDoc of groupsSnap.docs) {
    const groupId = gDoc.id;
    const entriesSnap = await gDoc.ref.collection("entries").get();
    console.log(`\nGrup ${groupId}: ${entriesSnap.size} entries`);

    for (const eDoc of entriesSnap.docs) {
      const entry = eDoc.data() as Record<string, unknown>;
      if (entry.displayName && entry.city !== undefined) {
        skipped++;
        continue;
      }
      const uid = entry.userId as string;
      const userSnap = await db.doc(`users/${uid}`).get();
      if (!userSnap.exists) {
        console.log(`  SKIP ${uid}: user doc tidak ada`);
        skipped++;
        continue;
      }
      const prof = userSnap.data() as {
        displayName?: string;
        avatarUrl?: string | null;
        city?: string;
      };
      await eDoc.ref.update({
        displayName: prof.displayName || uid.slice(0, 6),
        avatarUrl: prof.avatarUrl || null,
        city: prof.city || "Unknown",
      });
      console.log(`  OK ${uid}: ${prof.displayName} (${prof.city})`);
      updated++;
    }
  }

  console.log(`\nSelesai. Updated: ${updated}, skipped: ${skipped}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
