"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.ensureUser = void 0;
exports.computeUtcResetHour = computeUtcResetHour;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const geolocation_1 = require("../services/geolocation");
const appCheck_1 = require("../utils/appCheck");
const db = admin.firestore();
// Helper: compute utcResetHour (0-23) for given IANA timezone
// Finds UTC hour when local time is 00:00. Handles DST and 30-min offsets via brute force.
function computeUtcResetHour(timezone) {
    try {
        // Validate timezone by trying to format
        new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    }
    catch (_a) {
        throw new https_1.HttpsError("invalid-argument", `Invalid timezone: ${timezone}`);
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
        if (localHour === 0)
            return utcHour;
    }
    // Fallback simple: assume UTC (0)
    return 0;
}
function isValidTimezone(tz) {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
    }
    catch (_a) {
        return false;
    }
}
function getRequestIp(rawRequest) {
    var _a, _b, _c, _d;
    const req = rawRequest;
    if (!req)
        return null;
    // Express ip or x-forwarded-for
    const forwarded = ((_a = req.headers) === null || _a === void 0 ? void 0 : _a["x-forwarded-for"]) || ((_b = req.headers) === null || _b === void 0 ? void 0 : _b["X-Forwarded-For"]);
    if (forwarded) {
        const first = (_c = forwarded.split(",")[0]) === null || _c === void 0 ? void 0 : _c.trim();
        if (first)
            return first;
    }
    if (req.ip)
        return req.ip;
    if ((_d = req.socket) === null || _d === void 0 ? void 0 : _d.remoteAddress)
        return req.socket.remoteAddress;
    return null;
}
/**
 * ensureUser — idempotent creation of users/{uid} on first login.
 * Called from client after auth with auto-detected timezone.
 * If doc already exists, returns existing and optionally updates missing fields (city via IP if needed).
 */
exports.ensureUser = (0, https_1.onCall)(async (request) => {
    var _a;
    (0, appCheck_1.enforceAppCheck)(request);
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    const uid = request.auth.uid;
    const data = request.data;
    const timezone = (data === null || data === void 0 ? void 0 : data.timezone) || "Asia/Jakarta";
    const displayName = (_a = data === null || data === void 0 ? void 0 : data.displayName) === null || _a === void 0 ? void 0 : _a.trim();
    if (!isValidTimezone(timezone)) {
        throw new https_1.HttpsError("invalid-argument", `Invalid timezone: ${timezone}`);
    }
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    if (snap.exists) {
        // Already exists — ensure utcResetHour is consistent, and try to fill missing city/province if needed
        const existing = snap.data();
        if (!existing["city"] || existing["city"] === "" || !existing["province"]) {
            const ip = getRequestIp(request.rawRequest);
            if (ip) {
                const geo = await (0, geolocation_1.resolveCityFromIp)(ip);
                if (geo) {
                    const patch = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
                    if (!existing["city"] || existing["city"] === "")
                        patch["city"] = geo.city;
                    if (!existing["province"])
                        patch["province"] = geo.region;
                    if (!existing["country"])
                        patch["country"] = geo.country;
                    if (Object.keys(patch).length > 1)
                        await userRef.update(patch);
                }
            }
        }
        return { created: false, uid };
    }
    const authUser = await admin.auth().getUser(uid).catch(() => null);
    const email = (authUser === null || authUser === void 0 ? void 0 : authUser.email) || request.auth.token.email || "";
    const photoURL = (authUser === null || authUser === void 0 ? void 0 : authUser.photoURL) || null;
    const utcResetHour = computeUtcResetHour(timezone);
    // Try to resolve city/province from IP unless user already has manual override (new user doesn't)
    let city = "";
    let province = null;
    let country = null;
    const ip = getRequestIp(request.rawRequest);
    if (ip) {
        const geo = await (0, geolocation_1.resolveCityFromIp)(ip);
        if (geo) {
            city = geo.city;
            province = geo.region || null;
            country = geo.country || null;
        }
    }
    const now = admin.firestore.FieldValue.serverTimestamp();
    await userRef.set({
        displayName: displayName || (authUser === null || authUser === void 0 ? void 0 : authUser.displayName) || (email ? email.split("@")[0] : "User"),
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
exports.updateProfile = (0, https_1.onCall)(async (request) => {
    (0, appCheck_1.enforceAppCheck)(request);
    if (!request.auth)
        throw new https_1.HttpsError("unauthenticated", "Authentication required");
    const uid = request.auth.uid;
    const data = request.data;
    if (!data || Object.keys(data).length === 0) {
        throw new https_1.HttpsError("invalid-argument", "At least one field required");
    }
    const updates = {};
    if (data.displayName !== undefined) {
        const v = data.displayName.trim();
        if (v.length === 0 || v.length > 100)
            throw new https_1.HttpsError("invalid-argument", "displayName must be 1-100 chars");
        updates["displayName"] = v;
    }
    if (data.avatarUrl !== undefined) {
        updates["avatarUrl"] = data.avatarUrl;
    }
    if (data.city !== undefined) {
        const v = data.city.trim();
        if (v.length === 0)
            throw new https_1.HttpsError("invalid-argument", "city cannot be empty");
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
        if (!isValidTimezone(data.timezone))
            throw new https_1.HttpsError("invalid-argument", `Invalid timezone: ${data.timezone}`);
        updates["timezone"] = data.timezone;
        updates["utcResetHour"] = computeUtcResetHour(data.timezone);
    }
    if (data.aiReportEnabled !== undefined) {
        if (typeof data.aiReportEnabled !== "boolean")
            throw new https_1.HttpsError("invalid-argument", "aiReportEnabled must be boolean");
        updates["aiReportEnabled"] = data.aiReportEnabled;
    }
    updates["updatedAt"] = admin.firestore.FieldValue.serverTimestamp();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) {
        throw new https_1.HttpsError("not-found", "User profile not found, call ensureUser first");
    }
    await userRef.update(updates);
    return { updated: true };
});
//# sourceMappingURL=user.js.map