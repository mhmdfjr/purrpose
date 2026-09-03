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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Trophy,
  Medal,
  Award,
  User,
  MapPin,
  Clock3,
  Globe,
  Sparkles,
  LogOut,
  Save,
  Shield,
  Crown,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Star,
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
  createdAt?: { toDate?: () => Date; seconds?: number };
};

type BadgeDoc = {
  tier: "gold" | "silver" | "bronze";
  cycleId: string;
  groupId: string;
  locationName: string;
  awardedAt?: { toDate?: () => Date; seconds?: number };
};

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [city, setCity] = useState("");
  const [timezone, setTimezone] = useState("");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [badges, setBadges] = useState<(BadgeDoc & { id: string })[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();

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
    try {
      const update = getUpdateProfileCallable();
      await update({
        displayName: displayName.trim() || undefined,
        city: city.trim() || undefined,
        timezone: timezone.trim() || undefined,
        aiReportEnabled: aiEnabled,
      });
      toast.success("Profile diperbarui!", {
        description: "Perubahan tersimpan.",
      });
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Update failed";
      const anyErr = e as { message?: string };
      const final = anyErr.message || msg;
      setError(final);
      toast.error("Gagal simpan", { description: final });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      await signOut();

      toast.success("Logout berhasil");
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Gagal melakukan logout");
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 border-2 border-border" />
        <div className="grid gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 border-2 border-border" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="p-4 font-bold">Not authenticated</div>;
  }

  const goldCount = badges.filter((b) => b.tier === "gold").length;
  const silverCount = badges.filter((b) => b.tier === "silver").length;
  const bronzeCount = badges.filter((b) => b.tier === "bronze").length;
  const totalBadges = badges.length;
  const avatarLetter = (
    profile?.displayName ||
    displayName ||
    user.email ||
    "?"
  )
    .slice(0, 1)
    .toUpperCase();
  const joinDate = profile?.createdAt?.toDate?.()
    ? formatDate(profile.createdAt.toDate())
    : null;

  function formatDate(d: Date) {
    try {
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d.toDateString();
    }
  }

  return (
    <main className="flex-1 mx-auto w-full bg-white">
      <div className="mx-auto space-y-6 w-full max-w-6xl p-4 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-heading font-black flex items-center gap-2">
              <User className="size-7" strokeWidth={2.5} /> Profile
            </h1>
            <p className="text-sm font-bold text-foreground/60">
              Manage your profile, badges, and preferences.
            </p>
          </div>
          <Badge className="w-fit bg-accent text-black border-black font-black gap-1">
            <Star className="size-3" strokeWidth={2.5} /> {totalBadges} BADGES
          </Badge>
        </div>

        {/* Hero + Stats */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card className="border-2 shadow-shadow bg-background cols-span-1 md:col-span-2">
            <CardContent className="px-6 py-0 md:py-2 lg:py-4">
              <div className="flex gap-4">
                <Avatar className="size-20 md:size-28 border-2 border-border rounded-none shadow-shadow bg-accent shrink-0">
                  <AvatarImage
                    src={profile?.avatarUrl || user.photoURL || undefined}
                  />
                  <AvatarFallback className="rounded-none font-black text-2xl bg-accent text-black">
                    {avatarLetter}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="font-heading text-lg md:text-xl font-black leading-tight truncate">
                    {profile?.displayName || displayName || "-"}
                  </h2>
                  <p className="text-xs md:text-sm font-bold text-foreground/60 truncate">
                    {user.email}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge className="bg-humble text-xs md:text-sm border-black font-black gap-1">
                      <MapPin className="size-2 md:size-3" strokeWidth={2.5} />{" "}
                      {profile?.city || city || "-"}
                      {profile?.province ? `, ${profile.province}` : ""}
                    </Badge>
                    {profile?.cityManualOverride ? (
                      <Badge className="bg-info text-white border-black font-black text-xs md:text-sm">
                        manual
                      </Badge>
                    ) : (
                      <Badge
                        variant="neutral"
                        className="bg-hustle border-black font-black text-xs md:text-sm"
                      >
                        auto
                      </Badge>
                    )}
                    <Badge
                      variant="neutral"
                      className="text-xs md:text-sm bg-accent border-black font-black gap-1"
                    >
                      <Clock3 className="size-2 md:size-3" strokeWidth={2.5} />{" "}
                      UTC+
                      {profile?.utcResetHour ?? "-"}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5 font-bold">
                    <span className="text-xs md:text-sm border-2 border-border font-black bg-humble px-2 py-1 inline-flex items-center gap-1">
                      <Globe className="size-2 md:size-3" strokeWidth={2.5} />{" "}
                      {profile?.timezone || timezone || "-"}
                    </span>
                    {joinDate && (
                      <span className="text-xs md:text-sm border-2 border-border bg-info font-black text-white px-2 py-1">
                        Joined on {joinDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="my-4 h-0.5 bg-border" />

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="border-2 border-border bg-accent p-2 shadow-sm">
                  <Trophy className="mx-auto size-4" strokeWidth={2.5} />
                  <p className="font-black text-lg leading-none mt-1">
                    {goldCount}
                  </p>
                  <p className="text-xs font-black">Gold</p>
                </div>
                <div className="border-2 border-border bg-(--neo-gray-100) p-2 shadow-sm">
                  <Medal className="mx-auto size-4" strokeWidth={2.5} />
                  <p className="font-black text-lg leading-none mt-1">
                    {silverCount}
                  </p>
                  <p className="text-xs font-black">Silver</p>
                </div>
                <div className="border-2 border-border bg-yellow-700 text-white p-2 shadow-sm">
                  <Award className="mx-auto size-4" strokeWidth={2.5} />
                  <p className="font-black text-lg leading-none mt-1">
                    {bronzeCount}
                  </p>
                  <p className="text-xs font-black">Bronze</p>
                </div>
              </div>

              {totalBadges > 0 && (
                <div className="mt-3">
                  <Progress
                    value={Math.min((totalBadges / 10) * 100, 100)}
                    className="h-2 [&>div]:bg-black"
                  />
                  <p className="text-xs font-bold text-foreground/60 mt-1">
                    {totalBadges} badge collected, keep it up!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4 cols-span-1 md:col-span-1">
            <Card className="border-2 shadow-shadow bg-accent">
              <CardHeader className="border-b-2 pb-2 border-border">
                <CardTitle className="text-sm font-black flex items-center gap-1">
                  <Sparkles className="size-4" strokeWidth={2.5} /> QUICK STATS
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 py-0 text-sm font-bold">
                <div className="flex justify-between border-2 border-border bg-white p-2">
                  <span>Total Badges</span>
                  <Badge className="bg-black text-white border-black font-black">
                    {totalBadges}
                  </Badge>
                </div>
                <div className="flex justify-between border-2 border-border bg-white p-2">
                  <span>Gold</span>
                  <span className="font-black">{goldCount}</span>
                </div>
                <div className="flex justify-between border-2 border-border bg-white p-2">
                  <span>AI Suggestions</span>
                  <Badge
                    variant="neutral"
                    className={`font-black border-black ${aiEnabled ? "bg-humble text-black" : "bg-(--neo-gray-100)"}`}
                  >
                    {aiEnabled ? "ON" : "OFF"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 shadow-shadow bg-hustle text-white">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="font-heading font-black text-sm flex items-center gap-1">
                    <Shield className="size-4" strokeWidth={2.5} /> Account
                    Security
                  </p>
                  <p className="text-xs font-bold text-white">
                    Logout from this session.
                  </p>
                </div>
                <Button
                  variant="neutral"
                  size="sm"
                  className="bg-white text-black border-black font-black gap-1"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4" strokeWidth={2.5} /> Logout
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit form */}
        <Card className="border-2 shadow-shadow bg-secondary-background">
          <CardHeader className="border-b-2 pb-2 border-border bg-white">
            <CardTitle className="flex items-center gap-2">
              <Settings className="size-5" strokeWidth={2.5} /> Edit Profile
            </CardTitle>
            <p className="text-xs font-bold text-foreground/60">
              Change your display name, city (manual override), timezone, and AI
              preferences.
            </p>
          </CardHeader>
          <form onSubmit={handleSave}>
            <CardContent className="space-y-4 py-2 md:py-4 lg:py-6">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" strokeWidth={2.5} />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription className="font-bold">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="displayName" className="font-black">
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Purrfect User"
                    className="bg-white border-2 font-bold"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="city" className="font-black">
                    City{" "}
                    <span className="text-xs font-bold text-foreground/60">
                      (manual override if changed)
                    </span>
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Jakarta"
                    className="bg-white border-2 font-bold"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="timezone" className="font-black">
                  Timezone (IANA)
                </Label>
                <Input
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="Asia/Jakarta"
                  className="bg-white border-2 font-bold"
                />
                <p className="text-xs font-bold text-foreground/60">
                  Auto-detected:{" "}
                  {Intl.DateTimeFormat().resolvedOptions().timeZone} • Changing
                  the timezone will recalculate the UTC reset hour.
                </p>
              </div>

              <div className="flex items-center justify-between border-2 border-border bg-white p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center border-2 border-border bg-accent">
                    <Sparkles className="size-4 text-black" strokeWidth={2.5} />
                  </div>
                  <div>
                    <Label
                      htmlFor="aiEnabled"
                      className="font-black cursor-pointer"
                    >
                      AI-enhanced weekly suggestions
                    </Label>
                    <p className="text-xs font-bold text-foreground/60">
                      Gemini free-tier, enable for AI suggestions in the weekly
                      report.
                    </p>
                  </div>
                </div>
                <Switch
                  id="aiEnabled"
                  checked={aiEnabled}
                  onCheckedChange={setAiEnabled}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t-2 pt-2 border-border flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-accent text-black border-black font-black gap-1.5"
              >
                <Save className="size-4" strokeWidth={2.5} />{" "}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Badges */}
        <Card className="border-2 shadow-shadow bg-background">
          <CardHeader className="border-b-2 pb-2 border-border">
            <CardTitle className="flex items-center gap-2">
              <Crown className="size-5" strokeWidth={2.5} /> Badges Collection
              <Badge className="bg-black text-white border-black font-black">
                {badges.length}
              </Badge>
            </CardTitle>
            <p className="text-xs font-bold text-foreground/60">
              Top 3 per group leaderboard, tied to week & group.
            </p>
          </CardHeader>
          <CardContent className="py-2">
            {badgesLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 border-2 border-border" />
                ))}
              </div>
            ) : badges.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-border">
                <Inbox
                  className="mx-auto size-8 text-foreground"
                  strokeWidth={2}
                />
                <p className="text-sm font-black mt-2">No badges yet</p>
                <p className="text-xs font-bold text-foreground/60 max-w-md mx-auto mt-1">
                  Enter Top 3 weekly leaderboard to get a badge! Badge
                  Gold/Silver/Bronze to match ur rank.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {badges.map((b) => {
                  const isGold = b.tier === "gold";
                  const isSilver = b.tier === "silver";
                  const bg = isGold
                    ? "var(--color-accent)"
                    : isSilver
                      ? "var(--neo-gray-100)"
                      : "var(--color-info)";
                  const Icon = isGold ? Trophy : isSilver ? Medal : Award;
                  const label = isGold
                    ? "Gold"
                    : isSilver
                      ? "Silver"
                      : "Bronze";
                  const dateStr = b.awardedAt?.toDate
                    ? b.awardedAt.toDate().toLocaleDateString("id-ID")
                    : b.awardedAt?.seconds
                      ? new Date(b.awardedAt.seconds * 1000).toLocaleDateString(
                          "id-ID",
                        )
                      : "";
                  return (
                    <div
                      key={b.id}
                      className={`border-2 border-border p-4 flex gap-3 shadow-shadow ${isGold ? "rotate-[-0.3deg]" : isSilver ? "rotate-[0.3deg]" : "rotate-[-0.2deg]"}`}
                      style={{ background: bg }}
                    >
                      <div
                        className={`flex size-10 items-center justify-center border-2 border-border shadow-sm shrink-0 ${isGold ? "bg-black text-accent" : isSilver ? "bg-white" : "bg-white text-info"}`}
                      >
                        <Icon className="size-5" strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-black leading-tight ${b.tier === "bronze" ? "text-white" : "text-black"}`}
                        >
                          {label} - {b.locationName}
                        </p>
                        <p
                          className={`text-xs font-bold ${b.tier === "bronze" ? "text-white/80" : "text-black/70"}`}
                        >
                          Minggu {b.cycleId} • Grup {b.groupId.slice(0, 6)}
                        </p>
                        {dateStr && (
                          <p
                            className={`text-xs font-bold flex items-center gap-1 mt-1 ${b.tier === "bronze" ? "text-white/70" : "text-black/60"}`}
                          >
                            <CheckCircle2
                              className="size-3"
                              strokeWidth={2.5}
                            />
                            {dateStr}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
