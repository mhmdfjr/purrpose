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
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
      });
      return app;
    } catch (e) {
      console.error("[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT", e);
    }
  }

  try {
    app = initializeApp({
      projectId,
      credential: applicationDefault(),
    });
    return app;
  } catch {
    if (!getApps().length) {
      app = initializeApp({ projectId });
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
