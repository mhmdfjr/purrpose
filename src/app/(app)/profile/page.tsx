"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/firebase";
import {
  getUpdateProfileCallable,
  getEnsureUserCallable,
} from "@/lib/firebase-functions";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award } from "lucide-react";

type ProfileDoc = {
  displayName: string;
  email: string;
  city: string;
  province?: string | null;
  cityManualOverride: boolean;
  timezone: string;
  utcResetHour: number;
  aiReportEnabled: boolean;
  avatarUrl?: string | null;
};

type BadgeDoc = {
  tier: "gold" | "silver" | "bronze";
  cycleId: string;
  groupId: string;
  locationName: string;
  awardedAt?: { toDate?: () => Date; seconds?: number };
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<ProfileDoc | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [displayName, setDisplayName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [timezone, setTimezone] = React.useState("");
  const [aiEnabled, setAiEnabled] = React.useState(true);
  const [badges, setBadges] = React.useState<(BadgeDoc & { id: string })[]>([]);
  const [badgesLoading, setBadgesLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        try {
          const ensure = getEnsureUserCallable();
          await ensure({ timezone: tz });
        } catch (e) {
          console.warn("[profile] ensureUser failed", e);
        }
        const retry = await getDoc(ref);
        if (retry.exists()) {
          const data = retry.data() as ProfileDoc;
          setProfile(data);
          setDisplayName(data.displayName || "");
          setCity(data.city || "");
          setTimezone(data.timezone || tz);
          setAiEnabled(data.aiReportEnabled ?? true);
        }
      } else {
        const data = snap.data() as ProfileDoc;
        setProfile(data);
        setDisplayName(data.displayName || "");
        setCity(data.city || "");
        setTimezone(data.timezone || "");
        setAiEnabled(data.aiReportEnabled ?? true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const loadBadges = React.useCallback(async () => {
    if (!user) return;
    setBadgesLoading(true);
    try {
      const col = collection(db, `users/${user.uid}/badges`);
      const q = query(col, orderBy("awardedAt", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as BadgeDoc),
      }));
      setBadges(list);
    } catch (e) {
      console.warn("[profile] badges load failed", e);
    } finally {
      setBadgesLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    void loadBadges();
  }, [loadBadges]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const update = getUpdateProfileCallable();
      await update({
        displayName: displayName.trim() || undefined,
        city: city.trim() || undefined,
        timezone: timezone.trim() || undefined,
        aiReportEnabled: aiEnabled,
      });
      setSuccess("Profile updated!");
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed";
      // Firebase callable errors have code/message in details
      const anyErr = e as { message?: string };
      setError(anyErr.message || msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading profile...</div>;
  }

  if (!user) {
    return <div className="p-4">Not authenticated</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-heading font-black">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {profile && (
            <p className="text-xs text-muted-foreground">
              UID: {user.uid} • City: {profile.city}
              {profile.province ? `, ${profile.province}` : ""}{" "}
              {profile.cityManualOverride ? "(manual)" : "(auto)"} • UTC reset
              hour: {profile.utcResetHour}
            </p>
          )}
        </CardHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 p-2">
                {error}
              </div>
            )}
            {success && (
              <div className="text-sm text-green-700 bg-green-50 border-2 border-green-200 p-2">
                {success}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Purrfect User"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">City (manual override if changed)</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Jakarta"
              />
              <p className="text-xs text-muted-foreground">
                Changing city sets manual override so geolocation won&apos;t
                overwrite it.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone (IANA)</Label>
              <Input
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Asia/Jakarta"
              />
              <p className="text-xs text-muted-foreground">
                Auto-detected:{" "}
                {Intl.DateTimeFormat().resolvedOptions().timeZone} • Changing
                recalculates UTC reset hour.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="aiEnabled"
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
                className="h-4 w-4 border-2 border-border"
              />
              <Label htmlFor="aiEnabled">AI-enhanced weekly suggestions</Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Badges — Collectible</CardTitle>
          <p className="text-xs text-muted-foreground">
            Top 3 per grup leaderboard. Gold=trophy Yellow, Silver=medal Gray,
            Bronze=award Blue (DESIGN 7). Terikat minggu & lokasi.
          </p>
        </CardHeader>
        <CardContent>
          {badgesLoading ? (
            <p className="text-sm">Loading badges...</p>
          ) : badges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada badge. Masuk Top 3 leaderboard mingguan untuk dapat
              badge!
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {badges.map((b) => {
                const isGold = b.tier === "gold";
                const isSilver = b.tier === "silver";
                const bg = isGold
                  ? "var(--color-accent)"
                  : isSilver
                    ? "var(--neo-gray-100)"
                    : "var(--color-info)";
                const Icon = isGold ? Trophy : isSilver ? Medal : Award;
                const label = isGold ? "Gold" : isSilver ? "Silver" : "Bronze";
                return (
                  <div
                    key={b.id}
                    className="border-2 border-border p-3 flex items-center gap-3"
                    style={{ background: bg }}
                  >
                    <Icon
                      className="h-6 w-6 shrink-0 text-black"
                      strokeWidth={2.5}
                    />
                    <div>
                      <p className="text-sm font-black text-black">
                        {label} — {b.locationName}
                      </p>
                      <p className="text-xs text-black/70">
                        Minggu {b.cycleId} • Grup {b.groupId}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
