export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, getAdminAuth } from "@/lib/firebase-admin";
import { verifyAuth, mapError } from "@/lib/server/auth";

function getRequestIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return null;
}

// Inline geolocation to avoid importing functions services that use Node fetch differently
async function resolveCityFromIp(ip: string | null): Promise<{ city: string; region: string | null; country: string | null } | null> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) return null;
  const apiKey = process.env.IP2LOCATION_API_KEY || process.env.NEXT_PUBLIC_IP2LOCATION_API_KEY || "";
  if (!apiKey) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const url = `https://api.ip2location.io/?key=${apiKey}&ip=${encodeURIComponent(ip)}&format=json`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (data["error"]) return null;
    const city = (data["city_name"] as string) || "";
    if (!city) return null;
    return { city, region: (data["region_name"] as string) || null, country: (data["country_name"] as string) || null };
  } catch {
    return null;
  }
}

import { computeUtcResetHour, isValidTimezone } from "@/lib/server/time";

export async function POST(req: NextRequest) {
  try {
    const { uid } = await verifyAuth(req);
    const body = (await req.json().catch(() => ({}))) as { timezone?: string; displayName?: string };
    const timezone = body.timezone || "Asia/Jakarta";
    const displayName = body.displayName?.trim();
    if (!isValidTimezone(timezone)) throw { status: 400, code: "invalid-argument", message: `Invalid timezone: ${timezone}` };

    const db = getAdminFirestore();
    const userRef = db.collection("users").doc(uid);
    const snap = await userRef.get();
    if (snap.exists) {
      const existing = snap.data() as Record<string, unknown>;
      if (!existing["city"] || existing["city"] === "" || !existing["province"]) {
        const ip = getRequestIp(req);
        const geo = await resolveCityFromIp(ip);
        if (geo) {
          const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
          if (!existing["city"] || existing["city"] === "") patch["city"] = geo.city;
          if (!existing["province"]) patch["province"] = geo.region;
          if (!existing["country"]) patch["country"] = geo.country;
          if (Object.keys(patch).length > 1) await userRef.update(patch);
        }
      }
      return NextResponse.json({ created: false, uid });
    }

    const authUser = await getAdminAuth().getUser(uid).catch(() => null);
    const email = authUser?.email || "";
    const photoURL = authUser?.photoURL || null;
    const utcResetHour = computeUtcResetHour(timezone);
    let city = "";
    let province: string | null = null;
    let country: string | null = null;
    const ip = getRequestIp(req);
    const geo = await resolveCityFromIp(ip);
    if (geo) {
      city = geo.city;
      province = geo.region;
      country = geo.country;
    }
    const now = FieldValue.serverTimestamp();
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
      currentCycleId: null,
      createdAt: now,
      updatedAt: now,
    });
    return NextResponse.json({ created: true, uid, city, timezone, utcResetHour });
  } catch (e) {
    const { status, body } = mapError(e);
    console.error("[api/user/ensure] error", e);
    return NextResponse.json(body, { status });
  }
}
