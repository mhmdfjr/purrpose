import "server-only";

import { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

export async function verifyAuth(req: NextRequest): Promise<{ uid: string; email?: string }> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw { status: 401, code: "unauthenticated", message: "Missing Authorization Bearer token" };
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email };
  } catch (e) {
    throw { status: 401, code: "unauthenticated", message: "Invalid ID token", cause: e };
  }
}

export function mapError(e: unknown): { status: number; body: Record<string, unknown> } {
  const any = e as { status?: number; code?: string; message?: string };
  if (any.status && any.code) {
    return { status: any.status, body: { error: any.message, code: any.code } };
  }
  // HttpsError style from callable logic
  const code = (any.code as string) || "unknown";
  const msg = any.message || "Internal error";
  const statusMap: Record<string, number> = {
    "invalid-argument": 400,
    "failed-precondition": 400,
    "not-found": 404,
    "unauthenticated": 401,
    "permission-denied": 403,
    "resource-exhausted": 429,
    "unavailable": 503,
  };
  return { status: statusMap[code] || 500, body: { error: msg, code } };
}
