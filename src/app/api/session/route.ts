import { NextRequest, NextResponse } from "next/server";
import { createSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "idToken required" }, { status: 400 });
    }

    const { sessionCookie, expiresIn } = await createSessionCookie(idToken);

    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000,
    });
    return res;
  } catch (e) {
    console.error("[session] POST error", e);
    const msg = e instanceof Error ? e.message : String(e);
    const isCredentialError = msg.includes("Could not load the default credentials") || msg.includes("invalid-credential") || msg.includes("Failed to fetch a valid Google OAuth2");
    // Local dev without FIREBASE_SERVICE_ACCOUNT: allow auth to proceed client-side, don't block registration
    if (isCredentialError && process.env.NODE_ENV !== "production") {
      console.warn("[session] Admin credential not configured — skipping session cookie for local dev. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS to enable SSR session (see .env.example).");
      return NextResponse.json({ success: true, warning: "sessionSkipped: Admin credential not configured for local dev" });
    }
    return NextResponse.json({ error: "Failed to create session" }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  // Clear cookie
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
