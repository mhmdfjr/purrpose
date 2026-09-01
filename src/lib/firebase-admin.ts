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

  // Try JSON string (Vercel env) — handle base64 edge; keep \n escaped for JSON.parse
  if (serviceAccountJson) {
    try {
      let jsonStr = serviceAccountJson.trim();
      // Handle if user pasted base64 encoded JSON
      if (!jsonStr.startsWith("{")) {
        try {
          jsonStr = Buffer.from(jsonStr, "base64").toString("utf-8");
        } catch {}
      }
      // Note: DO NOT replace \\n -> \n before JSON.parse — JSON needs \n escaped.
      // We parse first, then let cert() handle newline conversion.
      const serviceAccount = JSON.parse(jsonStr);
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
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
