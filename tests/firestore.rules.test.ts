import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import fs from "fs";

let testEnv: RulesTestEnvironment | undefined;

beforeAll(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    console.warn("[rules-test] FIRESTORE_EMULATOR_HOST not set — skipping, run via: firebase emulators:exec 'npm run test:rules'");
    return;
  }
  testEnv = await initializeTestEnvironment({
    projectId: "purrpose-test",
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

describe("firestore.rules — M7", () => {
  it("users/{uid} — owner can read own, other cannot", async () => {
    if (!testEnv) return;
    const alice = testEnv.authenticatedContext("alice");
    const bob = testEnv.authenticatedContext("bob");

    // Setup: create alice doc as admin
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice"), { displayName: "Alice" });
    });

    await assertSucceeds(getDoc(doc(alice.firestore(), "users/alice")));
    await assertFails(getDoc(doc(bob.firestore(), "users/alice")));
  });

  it("users/{uid}/tasks — read own allowed, write denied from client", async () => {
    if (!testEnv) return;
    const alice = testEnv.authenticatedContext("alice");

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/tasks/t1"), {
        category: "hustle",
        title: "Test",
        level: 3,
        durationHours: 1,
        date: "2026-09-01",
        status: "pending",
        score: null,
      });
    });

    await assertSucceeds(getDoc(doc(alice.firestore(), "users/alice/tasks/t1")));

    // Write should fail (client direct write denied)
    await assertFails(
      setDoc(doc(alice.firestore(), "users/alice/tasks/t1"), {
        title: "Hacked",
      })
    );
  });

  it("users/{uid}/weeklyReports — owner read allowed", async () => {
    if (!testEnv) return;
    const alice = testEnv.authenticatedContext("alice");
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/weeklyReports/2026-W36"), {
        weekId: "2026-W36",
        hustleScore: 10,
      });
    });
    await assertSucceeds(getDoc(doc(alice.firestore(), "users/alice/weeklyReports/2026-W36")));
  });

  it("users/{uid}/badges — owner read allowed", async () => {
    if (!testEnv) return;
    const alice = testEnv.authenticatedContext("alice");
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice/badges/b1"), { tier: "gold" });
    });
    await assertSucceeds(getDoc(doc(alice.firestore(), "users/alice/badges/b1")));
  });

  it("leaderboardCycles — authenticated read allowed (M6 blanket)", async () => {
    if (!testEnv) return;
    const alice = testEnv.authenticatedContext("alice");
    const unauth = testEnv.unauthenticatedContext();

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "leaderboardCycles/2026-W36"), { weekId: "2026-W36" });
    });

    await assertSucceeds(getDoc(doc(alice.firestore(), "leaderboardCycles/2026-W36")));
    await assertFails(getDoc(doc(unauth.firestore(), "leaderboardCycles/2026-W36")));
  });

  it("leaderboardCycles write denied from client", async () => {
    if (!testEnv) return;
    const alice = testEnv.authenticatedContext("alice");
    await assertFails(setDoc(doc(alice.firestore(), "leaderboardCycles/2026-W36"), { weekId: "hack" }));
  });
});
