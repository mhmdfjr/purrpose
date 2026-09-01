import { HttpsError } from "firebase-functions/v2/https";

/**
 * M7 App Check enforcement helper
 * Per ARCHITECTURE 7 & API 1 conventions: require App Check token.
 * In emulator or when ENFORCE_APP_CHECK != "true", only warn (graceful for dev).
 * Set ENFORCE_APP_CHECK=true in production to strictly enforce.
 */
export function enforceAppCheck(request: { app?: unknown; rawRequest?: unknown }) {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  const enforce = process.env.ENFORCE_APP_CHECK === "true";

  if (!request.app) {
    if (isEmulator) {
      // Allow in emulator without token
      return;
    }
    if (enforce) {
      throw new HttpsError("failed-precondition", "App Check token missing");
    } else {
      // Warn but allow — M7 hardening phase, enforcement will be toggled via env
      console.warn("[AppCheck] missing token, allowing (ENFORCE_APP_CHECK not set)");
    }
  }
}
