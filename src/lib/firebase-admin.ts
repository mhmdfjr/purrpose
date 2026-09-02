import "server-only";

import { getApps, initializeApp, cert, applicationDefault, App, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Singleton pattern for Admin SDK — safe for Next.js hot reload and serverless
let app: App | undefined;

function getAdminApp(): App {
  if (app) return app;
  const apps = getApps();
  if (apps.length) {
    app = apps[0]!;
    return app;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID;

  // Try JSON string (Vercel env) — handle base64 / multi-line pasted JSON
  if (serviceAccountJson) {
    try {
      let jsonStr = serviceAccountJson.trim();
      if (!jsonStr.startsWith("{")) {
        try {
          jsonStr = Buffer.from(jsonStr, "base64").toString("utf-8");
        } catch {}
      }
      let serviceAccount: Record<string, unknown> | null = null;
      try {
        serviceAccount = JSON.parse(jsonStr);
      } catch (parseErr) {
        // Handle pasted multi-line JSON where private_key contains actual newlines (invalid JSON)
        // Fix only the private_key value's internal newlines
        const errMsg = (parseErr as Error).message || "";
        if (errMsg.includes("Bad control character") || errMsg.includes("Unexpected token")) {
          // Replace actual newlines inside private_key string with \n escaped
          // This handles Vercel env where SA was pasted as pretty-printed multi-line JSON
          const fixed = jsonStr.replace(/"private_key"\s*:\s*"([\s\S]*?)"\s*,/m, (_m, p1: string) => {
            const escaped = (p1 as string).replace(/\n/g, "\\n").replace(/\r/g, "");
            return `"private_key": "${escaped}",`;
          });
          serviceAccount = JSON.parse(fixed);
          console.warn("[firebase-admin] Fixed multi-line private_key newlines for JSON parse");
        } else {
          throw parseErr;
        }
      }
      app = initializeApp({
        credential: cert(serviceAccount as Parameters<typeof cert>[0]),
        projectId: (serviceAccount as { project_id?: string }).project_id || projectId,
      });
      return app;
    } catch (e) {
      console.error("[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT", e);
    }
  }

  // Try file path (local dev GOOGLE_APPLICATION_CREDENTIALS)
  if (serviceAccountPath) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs");
      if (fs.existsSync(serviceAccountPath)) {
        const fileContent = fs.readFileSync(serviceAccountPath, "utf-8");
        const serviceAccount = JSON.parse(fileContent);
        app = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || projectId,
        });
        return app;
      } else {
        console.warn(`[firebase-admin] GOOGLE_APPLICATION_CREDENTIALS file not found: ${serviceAccountPath}`);
      }
    } catch (e) {
      console.warn("[firebase-admin] Failed to load GOOGLE_APPLICATION_CREDENTIALS", e);
    }
  }

  // Fallback: try applicationDefault (will be ComputeEngineCredential locally and fail on use)
  try {
    app = initializeApp({
      projectId,
      credential: applicationDefault(),
    });
    console.warn("[firebase-admin] Initialized with applicationDefault() — will fail if ADC not configured. For local, set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS (see .env.example)");
    return app;
  } catch {
    if (!getApps().length) {
      app = initializeApp({ projectId });
      console.warn("[firebase-admin] Initialized without credential — createSessionCookie will fail. Set FIREBASE_SERVICE_ACCOUNT for local session support.");
      return app;
    }
    app = getApp();
    return app;
  }
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}

export function getAdminAppInstance() {
  return getAdminApp();
}
