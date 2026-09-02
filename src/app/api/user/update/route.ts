export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { verifyAuth, mapError } from "@/lib/server/auth";
import { computeUtcResetHour, isValidTimezone } from "@/lib/server/time";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);
    const data = (await req.json()) as {
      displayName?: string;
      avatarUrl?: string;
      city?: string;
      province?: string;
      timezone?: string;
      aiReportEnabled?: boolean;
    };
    if (!data || Object.keys(data).length === 0) throw { status: 400, code: "invalid-argument", message: "At least one field required" };

    const updates: Record<string, unknown> = {};
    if (data.displayName !== undefined) {
      const v = data.displayName.trim();
      if (v.length === 0 || v.length > 100) throw { status: 400, code: "invalid-argument", message: "displayName must be 1-100 chars" };
      updates["displayName"] = v;
    }
    if (data.avatarUrl !== undefined) updates["avatarUrl"] = data.avatarUrl;
    if (data.city !== undefined) {
      const v = data.city.trim();
      if (v.length === 0) throw { status: 400, code: "invalid-argument", message: "city cannot be empty" };
      updates["city"] = v;
      updates["cityManualOverride"] = true;
    }
    if (data.province !== undefined) {
      const v = data.province.trim();
      updates["province"] = v || null;
      updates["cityManualOverride"] = true;
    }
    if (data.timezone !== undefined) {
      if (!isValidTimezone(data.timezone)) throw { status: 400, code: "invalid-argument", message: `Invalid timezone: ${data.timezone}` };
      updates["timezone"] = data.timezone;
      updates["utcResetHour"] = computeUtcResetHour(data.timezone);
    }
    if (data.aiReportEnabled !== undefined) {
      if (typeof data.aiReportEnabled !== "boolean") throw { status: 400, code: "invalid-argument", message: "aiReportEnabled must be boolean" };
      updates["aiReportEnabled"] = data.aiReportEnabled;
    }
    updates["updatedAt"] = FieldValue.serverTimestamp();

    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) throw { status: 404, code: "not-found", message: "User profile not found, call ensure first" };
    await userRef.update(updates);
    return NextResponse.json({ updated: true });
  } catch (e) {
    const { status, body } = mapError(e);
    console.error("[api/user/update] error", e);
    return NextResponse.json(body, { status });
  }
}
