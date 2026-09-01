import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { resolveCityFromIp } from "../services/geolocation";
import { enforceAppCheck } from "../utils/appCheck";

const db = admin.firestore();

// Helper: compute utcResetHour (0-23) for given IANA timezone
// Finds UTC hour when local time is 00:00. Handles DST and 30-min offsets via brute force.
export function computeUtcResetHour(timezone: string): number {
  try {
    // Validate timezone by trying to format
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new HttpsError("invalid-argument", `Invalid timezone: ${timezone}`);
  }

  // Brute force: find UTC hour where local hour == 0
  // Use a fixed date that is DST-aware for current period? Use today at noon to avoid DST transition edge.
  const base = new Date();
  // Normalize to mid-month to avoid month-boundary issues
  for (let utcHour = 0; utcHour < 24; utcHour++) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), utcHour, 0, 0));
    const localHourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(d);
    const localHour = parseInt(localHourStr, 10) % 24;
    if (localHour === 0) return utcHour;
  }
  // Fallback simple: assume UTC (0)
  return 0;
}

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function getRequestIp(rawRequest: unknown): string | null {
  const req = rawRequest as { ip?: string; headers?: Record<string, string>; socket?: { remoteAddress?: string } } | undefined;
  if (!req) return null;
  // Express ip or x-forwarded-for
  const forwarded = req.headers?.["x-forwarded-for"] || req.headers?.["X-Forwarded-For"];
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  if (req.ip) return req.ip;
  if (req.socket?.remoteAddress) return req.socket.remoteAddress;
  return null;
}

/**
 * ensureUser — idempotent creation of users/{uid} on first login.
 * Called from client after auth with auto-detected timezone.
 * If doc already exists, returns existing and optionally updates missing fields (city via IP if needed).
 */
export const ensureUser = onCall(async (request) => {
  enforceAppCheck(request);
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  const uid = request.auth.uid;
  const data = request.data as { timezone?: string; displayName?: string } | undefined;
  const timezone = data?.timezone || "Asia/Jakarta";
  const displayName = data?.displayName?.trim();

  if (!isValidTimezone(timezone)) {
    throw new HttpsError("invalid-argument", `Invalid timezone: ${timezone}`);
  }

  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();

  if (snap.exists) {
    // Already exists — ensure utcResetHour is consistent, and try to fill missing city/province if needed
    const existing = snap.data() as Record<string, unknown>;
    if (!existing["city"] || existing["city"] === "" || !existing["province"]) {
      const ip = getRequestIp(request.rawRequest);
      if (ip) {
        const geo = await resolveCityFromIp(ip);
        if (geo) {
          const patch: Record<string, unknown> = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
          if (!existing["city"] || existing["city"] === "") patch["city"] = geo.city;
          if (!existing["province"]) patch["province"] = geo.region;
          if (!existing["country"]) patch["country"] = geo.country;
          if (Object.keys(patch).length > 1) await userRef.update(patch);
        }
      }
    }
    return { created: false, uid };
  }

  const authUser = await admin.auth().getUser(uid).catch(() => null);
  const email = authUser?.email || request.auth.token.email || "";
  const photoURL = authUser?.photoURL || null;

  const utcResetHour = computeUtcResetHour(timezone);

  // Try to resolve city/province from IP unless user already has manual override (new user doesn't)
  let city = "";
  let province: string | null = null;
  let country: string | null = null;
  const ip = getRequestIp(request.rawRequest);
  if (ip) {
    const geo = await resolveCityFromIp(ip);
    if (geo) {
      city = geo.city;
      province = geo.region || null;
      country = geo.country || null;
    }
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  await userRef.set({
    displayName: displayName || authUser?.displayName || (email ? email.split("@")[0] : "User"),
    email,
    avatarUrl: photoURL,
    city: city || "Unknown",
    province,
    country,
    cityManualOverride: false,
    timezone,
    utcResetHour,
    aiReportEnabled: true,
    currentGroupId: null,
    createdAt: now,
    updatedAt: now,
  });

  return { created: true, uid, city, timezone, utcResetHour };
});

/**
 * updateProfile — edit profile fields, recomputes utcResetHour if timezone changes,
 * handles cityManualOverride flag.
 */
export const updateProfile = onCall(async (request) => {
  enforceAppCheck(request);
  if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required");
  const uid = request.auth.uid;
  const data = request.data as {
    displayName?: string;
    avatarUrl?: string;
    city?: string;
    province?: string;
    timezone?: string;
    aiReportEnabled?: boolean;
  } | undefined;

  if (!data || Object.keys(data).length === 0) {
    throw new HttpsError("invalid-argument", "At least one field required");
  }

  const updates: Record<string, unknown> = {};

  if (data.displayName !== undefined) {
    const v = data.displayName.trim();
    if (v.length === 0 || v.length > 100) throw new HttpsError("invalid-argument", "displayName must be 1-100 chars");
    updates["displayName"] = v;
  }
  if (data.avatarUrl !== undefined) {
    updates["avatarUrl"] = data.avatarUrl;
  }
  if (data.city !== undefined) {
    const v = data.city.trim();
    if (v.length === 0) throw new HttpsError("invalid-argument", "city cannot be empty");
    updates["city"] = v;
    updates["cityManualOverride"] = true;
  }
  if (data.province !== undefined) {
    const v = data.province.trim();
    updates["province"] = v || null;
    // Province manual override shares cityManualOverride flag
    updates["cityManualOverride"] = true;
  }
  if (data.timezone !== undefined) {
    if (!isValidTimezone(data.timezone)) throw new HttpsError("invalid-argument", `Invalid timezone: ${data.timezone}`);
    updates["timezone"] = data.timezone;
    updates["utcResetHour"] = computeUtcResetHour(data.timezone);
  }
  if (data.aiReportEnabled !== undefined) {
    if (typeof data.aiReportEnabled !== "boolean") throw new HttpsError("invalid-argument", "aiReportEnabled must be boolean");
    updates["aiReportEnabled"] = data.aiReportEnabled;
  }

  updates["updatedAt"] = admin.firestore.FieldValue.serverTimestamp();

  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "User profile not found, call ensureUser first");
  }

  await userRef.update(updates);
  return { updated: true };
});
