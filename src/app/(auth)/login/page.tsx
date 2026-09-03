"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/firebase";
import { getEnsureUserCallable } from "@/lib/firebase-functions";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import {
  ArrowRight,
  Briefcase,
  BedDouble,
  BarChart3,
  Check,
  Sparkles,
  Trophy,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const syncSessionAndOnboard = async (user: import("firebase/auth").User) => {
    try {
      let idToken: string | null = null;
      try {
        idToken = await user.getIdToken();
      } catch (e) {
        console.warn("[login] getIdToken failed, skipping session", e);
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
            console.warn("[login] session not ok, continuing", res.status, txt);
          }
        } catch (e) {
          console.warn("[login] session fetch failed, continuing", e);
        }
      }
    } catch (e) {
      console.warn("[login] session sync outer failed", e);
    }
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const ensureUser = getEnsureUserCallable();
      await ensureUser({
        timezone,
        displayName: user.displayName || undefined,
      });
    } catch (e) {
      console.warn("[login] ensureUser failed", e);
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
    <div className="w-full max-w-6xl grid gap-6 md:grid-cols-[1.05fr_0.95fr] items-center">
      {/* left: branding + neobrutalism collage */}
      <div className="hidden md:flex flex-col gap-6 pr-4">
        <Badge className="w-fit bg-accent text-black border-border font-black">
          <Sparkles className="mr-1 size-3" /> WELCOME BACK, BALANCE FIRST
        </Badge>
        <div>
          <h1 className="font-heading text-4xl font-black leading-none tracking-tight">
            Enter and do ur
            <br />
            <span className="inline-block border-2 border-border bg-hustle px-2 text-white shadow-shadow">
              daily
            </span>
            <span className="inline-block border-2 border-border bg-humble px-2 text-black shadow-shadow ml-2">
              progress.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/70">
            Track <b>Hustle</b> & <b>Humble</b> without punishment. Achieve high
            Balance Index, climb ur leaderboard.
          </p>
        </div>

        <div className="relative max-w-105">
          <Card className="relative z-10 border-hustle gap-0 bg-secondary-background rotate-[-1.2deg] shadow-shadow">
            <CardHeader className="">
              <CardTitle className="flex items-center gap-2 text-sm text-hustle">
                <Briefcase className="size-4" strokeWidth={2.5} /> HUSTLE •
                Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs font-bold">
              <div className="flex justify-between border-2 border-border bg-white p-2">
                Deep work - 2h{" "}
                <span className="flex items-center gap-1">
                  <Check className="size-3" strokeWidth={2.5} /> DONE
                </span>
              </div>
              <div className="h-2 border-2 border-border bg-white">
                <div className="h-full w-[72%] bg-hustle" />
              </div>
            </CardContent>
          </Card>
          <Card className="absolute -bottom-5 -right-3 z-20 w-[86%] border-humble bg-secondary-background rotate-1 shadow-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-humble">
                <BedDouble className="size-4" strokeWidth={2.5} /> HUMBLE •
                Recovery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs font-bold">
              <div className="flex justify-between border-2 border-border bg-white p-2">
                Chill walk - 1h <span>LV 2 ••○○○</span>
              </div>
              <div className="h-2 border-2 border-border bg-white">
                <div className="h-full w-[55%] bg-humble" />
              </div>
            </CardContent>
          </Card>
          <div className="h-8" />
        </div>

        <div className="flex gap-2 text-xs font-black">
          <span className="border-2 border-border bg-white px-2 py-1 shadow-shadow flex items-center gap-1">
            <BarChart3 className="size-3" strokeWidth={2.5} /> Balance 83
          </span>
          <span className="border-2 border-border bg-black text-white px-2 py-1 shadow-shadow flex items-center gap-1">
            <Trophy className="size-3" strokeWidth={2.5} /> Rank #3
          </span>
        </div>
      </div>

      {/* right: form */}
      <Card className="w-full max-w-md mx-auto border-2 gap-0 shadow-shadow bg-secondary-background">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-black">
            Login to Purrpose
          </CardTitle>
          <CardDescription className="text-sm">
            Enter ur email or continue with Google.
          </CardDescription>
          <div className="flex gap-2 pt-1">
            <span className="size-3 bg-hustle border-2 border-border" />
            <span className="size-3 bg-humble border-2 border-border" />
            <span className="size-3 bg-accent border-2 border-border" />
            <span className="size-3 bg-info border-2 border-border" />
          </div>
        </CardHeader>

        <form onSubmit={handleEmailLogin}>
          <CardContent className="py-2 space-y-4">
            {error && (
              <div className="border-2 border-red-600 bg-red-50 p-3 text-sm font-bold text-red-700">
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
                className="bg-white"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="#"
                  className="ml-auto text-xs font-bold underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-accent text-black border-border font-black text-base hover:translate-x-boxShadowX hover:translate-y-boxShadowY"
              disabled={loading}
            >
              {loading ? "Memproses..." : "Login"}{" "}
              <ArrowRight className="size-4" />
            </Button>

            <div className="relative flex items-center py-1">
              <div className="flex-1 border-t-2 border-border" />
              <span className="px-2 text-xs font-black">OR</span>
              <div className="flex-1 border-t-2 border-border" />
            </div>

            <Button
              type="button"
              variant="neutral"
              className="w-full bg-white font-bold"
              onClick={handleGoogle}
              disabled={loading}
            >
              <svg className="size-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Login with Google
            </Button>
          </CardContent>

          <div className="px-6">
            <div className="pt-4 text-center text-sm">
              Don't have an account?{" "}
              <Link
                href="/register"
                className="font-black underline underline-offset-4 decoration-2"
              >
                Register here
              </Link>
            </div>
            <p className="mt-2 text-center text-xs text-foreground/60">
              By logging in, you agree to track hustle & humble with balance.
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
