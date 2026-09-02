"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getEnsureUserCallable } from "@/lib/firebase-functions";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const syncSessionAndOnboard = async (user: import("firebase/auth").User) => {
    // Session sync — non-blocking, graceful for AppCheck/network failures (local dev without SA or site key)
    try {
      let idToken: string | null = null;
      try {
        idToken = await user.getIdToken();
      } catch (e) {
        console.warn("[login] getIdToken failed, skipping session (will use client auth)", e);
      }
      if (idToken) {
        try {
          const res = await fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
          });
          if (!res.ok) {
            const txt = await res.text().catch(() => "");
            console.warn("[login] session not ok, continuing with client auth", res.status, txt);
          }
        } catch (e) {
          console.warn("[login] session fetch failed, continuing", e);
        }
      }
    } catch (e) {
      console.warn("[login] session sync outer failed", e);
    }
    // Onboard: ensure user doc with timezone
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const ensureUser = getEnsureUserCallable();
      await ensureUser({
        timezone,
        displayName: user.displayName || undefined,
      });
    } catch (e) {
      console.warn("[login] ensureUser failed", e);
      // Don't block login on onboarding failure (e.g., functions not deployed, Vercel API fallback will handle)
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await syncSessionAndOnboard(cred.user);
      router.push("/home");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await syncSessionAndOnboard(cred.user);
      router.push("/home");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Login to Purrpose</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleEmailLogin} className="space-y-4">
        <CardContent>
          <div className="flex flex-col gap-6">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 p-2">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
          <Button
            type="button"
            variant="neutral"
            className="w-full"
            onClick={handleGoogle}
            disabled={loading}
          >
            Login with Google
          </Button>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="underline underline-offset-4">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
