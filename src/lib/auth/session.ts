import "server-only";

import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase-admin";

export const SESSION_COOKIE_NAME = "__session";
export const SESSION_EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function createSessionCookie(idToken: string) {
  const auth = getAdminAuth();
  // Verify token first to ensure it's valid before creating session cookie
  const expiresIn = SESSION_EXPIRES_IN_MS;
  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
  return { sessionCookie, expiresIn };
}

export async function verifySessionCookie(sessionCookie: string | undefined) {
  if (!sessionCookie) return null;
  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    return decoded; // contains uid, email etc
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionCookie(session);
}
