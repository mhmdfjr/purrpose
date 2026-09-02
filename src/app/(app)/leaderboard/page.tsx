"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import {
  Trophy,
  Medal,
  Award,
  Crown,
  Search,
  ArrowUpDown,
  Users,
  MapPin,
  BarChart3,
  Sparkles,
  AlertTriangle,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Entry = {
  userId: string;
  weeklyRawScore: number;
  balanceIndex: number;
  completionRate: number;
  balanceWeight: number;
  completionWeight: number;
  leaderboardScore: number;
  rank: number;
};

type GroupDoc = {
  locationLevel: "city" | "province";
  locationName: string;
  memberCount: number;
  status: string;
};

const PAGE_SIZE = 10;

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [cycleId, setCycleId] = React.useState<string | null>(null);
  const [groupId, setGroupId] = React.useState<string | null>(null);
  const [group, setGroup] = React.useState<GroupDoc | null>(null);
  const [entries, setEntries] = React.useState<
    (Entry & {
      displayName?: string;
      avatarUrl?: string | null;
      city?: string;
    })[]
  >([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<"rank" | "score" | "raw">("rank");
  const [page, setPage] = React.useState(0);
  const [isDemo, setIsDemo] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        setError("User profile not found");
        setLoading(false);
        return;
      }
      const uData = userSnap.data() as {
        currentGroupId?: string | null;
        currentCycleId?: string | null;
      };
      let cId = uData.currentCycleId || null;
      let gId = uData.currentGroupId || null;

      if (!cId || !gId) {
        const cyclesCol = collection(db, "leaderboardCycles");
        const cyclesSnap = await getDocs(cyclesCol);
        if (!cyclesSnap.empty) {
          const cycles = cyclesSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as { weekId: string }),
          }));
          cycles.sort((a, b) => b.id.localeCompare(a.id));
          for (const c of cycles) {
            const groupsCol = collection(
              db,
              `leaderboardCycles/${c.id}/groups`,
            );
            const groupsSnap = await getDocs(groupsCol);
            for (const gDoc of groupsSnap.docs) {
              const entryRef = doc(
                db,
                `leaderboardCycles/${c.id}/groups/${gDoc.id}/entries/${user.uid}`,
              );
              const entrySnap = await getDoc(entryRef);
              if (entrySnap.exists()) {
                cId = c.id;
                gId = gDoc.id;
                break;
              }
            }
            if (cId && gId) break;
          }
        }
      }

      if (!cId || !gId) {
        // Fallback: show demo leaderboard (fake users) so new user sees full experience immediately
        try {
          const cyclesCol = collection(db, "leaderboardCycles");
          const cyclesSnap = await getDocs(cyclesCol);
          if (!cyclesSnap.empty) {
            const cycles = cyclesSnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as { weekId: string; status?: string }),
            }));
            cycles.sort((a, b) => b.id.localeCompare(a.id));
            for (const c of cycles) {
              const groupsCol = collection(
                db,
                `leaderboardCycles/${c.id}/groups`,
              );
              const groupsSnap = await getDocs(groupsCol);
              if (groupsSnap.empty) continue;
              // Prefer group with most members (fake group Jakarta has 10)
              const groupDocs = groupsSnap.docs.sort(
                (a, b) =>
                  (b.data() as { memberCount: number }).memberCount -
                  (a.data() as { memberCount: number }).memberCount,
              );
              const demoGroupDoc = groupDocs[0];
              if (!demoGroupDoc) continue;
              const demoGId = demoGroupDoc.id;
              const demoGroup = demoGroupDoc.data() as GroupDoc;
              const entriesCol = collection(
                db,
                `leaderboardCycles/${c.id}/groups/${demoGId}/entries`,
              );
              const entriesSnap = await getDocs(
                query(entriesCol, orderBy("rank", "asc")),
              );
              if (entriesSnap.empty) continue;
              const demoList: (Entry & {
                displayName?: string;
                avatarUrl?: string | null;
                city?: string;
              })[] = [];
              for (const eDoc of entriesSnap.docs) {
                const entry = eDoc.data() as Entry;
                try {
                  const profSnap = await getDoc(doc(db, "users", entry.userId));
                  const prof = profSnap.exists()
                    ? (profSnap.data() as {
                        displayName?: string;
                        avatarUrl?: string | null;
                        city?: string;
                      })
                    : {};
                  demoList.push({
                    ...entry,
                    displayName: prof.displayName || entry.userId.slice(0, 6),
                    avatarUrl: prof.avatarUrl || null,
                    city: prof.city,
                  });
                } catch {
                  demoList.push(entry);
                }
              }
              demoList.sort((a, b) => a.rank - b.rank);
              // Add placeholder for current user at bottom if not already in list
              if (!demoList.some((e) => e.userId === user.uid)) {
                const profSnap = await getDoc(doc(db, "users", user.uid));
                const prof = profSnap.exists()
                  ? (profSnap.data() as {
                      displayName?: string;
                      avatarUrl?: string | null;
                      city?: string;
                    })
                  : {};
                demoList.push({
                  userId: user.uid,
                  weeklyRawScore: 0,
                  balanceIndex: 0,
                  completionRate: 0,
                  balanceWeight: 1,
                  completionWeight: 1,
                  leaderboardScore: 0,
                  rank: demoList.length + 1,
                  displayName:
                    prof.displayName || user.email?.split("@")[0] || "Kamu",
                  avatarUrl: prof.avatarUrl || user.photoURL || null,
                  city: prof.city || demoGroup.locationName,
                });
              }
              setCycleId(c.id);
              setGroupId(demoGId);
              setGroup(demoGroup);
              setEntries(demoList);
              setIsDemo(true);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn("[leaderboard] demo fallback failed", e);
        }
        setCycleId(null);
        setGroupId(null);
        setEntries([]);
        setIsDemo(false);
        setLoading(false);
        return;
      }
      setIsDemo(false);
      setCycleId(cId);
      setGroupId(gId);

      const groupRef = doc(db, `leaderboardCycles/${cId}/groups/${gId}`);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) setGroup(groupSnap.data() as GroupDoc);
      else setGroup(null);

      const entriesCol = collection(
        db,
        `leaderboardCycles/${cId}/groups/${gId}/entries`,
      );
      const entriesQ = query(entriesCol, orderBy("rank", "asc"));
      const entriesSnap = await getDocs(entriesQ);
      const list: (Entry & {
        displayName?: string;
        avatarUrl?: string | null;
        city?: string;
      })[] = [];

      for (const eDoc of entriesSnap.docs) {
        const entry = eDoc.data() as Entry;
        try {
          const profSnap = await getDoc(doc(db, "users", entry.userId));
          const prof = profSnap.exists()
            ? (profSnap.data() as {
                displayName?: string;
                avatarUrl?: string | null;
                city?: string;
              })
            : {};
          list.push({
            ...entry,
            displayName: prof.displayName || entry.userId.slice(0, 6),
            avatarUrl: prof.avatarUrl || null,
            city: prof.city,
          });
        } catch {
          list.push(entry);
        }
      }
      list.sort((a, b) => a.rank - b.rank);
      setEntries(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filteredSorted = React.useMemo(() => {
    let list = [...entries];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.displayName?.toLowerCase().includes(q) ||
          e.city?.toLowerCase().includes(q) ||
          e.userId.toLowerCase().includes(q),
      );
    }
    if (sort === "score")
      list.sort((a, b) => b.leaderboardScore - a.leaderboardScore);
    else if (sort === "raw")
      list.sort((a, b) => b.weeklyRawScore - a.weeklyRawScore);
    else list.sort((a, b) => a.rank - b.rank);
    return list;
  }, [entries, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const paginated = React.useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
  }, [filteredSorted, page]);

  React.useEffect(() => setPage(0), [search, sort]);

  const rankIcon = (rank: number) => {
    if (rank === 1)
      return <Trophy className="size-4 text-black" strokeWidth={2.5} />;
    if (rank === 2) return <Medal className="size-4" strokeWidth={2.5} />;
    if (rank === 3)
      return <Award className="size-4 text-white" strokeWidth={2.5} />;
    return <span className="text-xs font-black">#{rank}</span>;
  };

  const podium = entries.slice(0, 3);
  const selfEntry = entries.find((e) => e.userId === user?.uid);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 border-2 border-border" />
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 border-2 border-border" />
          ))}
        </div>
        <Skeleton className="h-64 border-2 border-border" />
      </div>
    );
  }

  if (!cycleId || !groupId || entries.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-heading font-black flex items-center gap-2">
          <Trophy className="size-7" strokeWidth={2.5} /> Leaderboard
        </h1>
        <Card className="border-2 border-dashed shadow-shadow">
          <CardContent className="pt-6 text-center">
            <Inbox className="mx-auto size-8 text-black" strokeWidth={2} />
            <p className="text-sm font-black mt-2">
              Belum ada leaderboard untukmu minggu ini.
            </p>
            <p className="text-xs font-bold text-foreground/60 mt-1 max-w-xl mx-auto">
              Leaderboard terbentuk otomatis tiap Senin 00:00 UTC. Pastikan kamu
              sudah punya weekly report dari task minggu lalu. Jika kamu di kota
              sepi, grup mungkin kecil.
            </p>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="size-4" strokeWidth={2.5} />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-black flex items-center gap-2">
            <Trophy className="size-7" strokeWidth={2.5} /> Leaderboard
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Badge className="bg-[var(--color-accent)] text-black border-black font-black gap-1">
              <MapPin className="size-3" strokeWidth={2.5} />{" "}
              {group?.locationName || groupId}
            </Badge>
            {group?.locationLevel === "province" && (
              <Badge
                variant="neutral"
                className="bg-[var(--neo-gray-100)] border-black font-black text-xs"
              >
                fallback province
              </Badge>
            )}
            {isDemo && (
              <Badge className="bg-black text-white border-black font-black text-xs">
                DEMO (fake data)
              </Badge>
            )}
            <span className="text-xs font-bold text-foreground/60">
              Minggu {cycleId} • {group?.memberCount} peserta • {group?.status}
              {isDemo ? " • preview" : ""}
            </span>
          </div>
          <p className="text-xs font-bold text-foreground/60 mt-1 flex items-center gap-1">
            <Sparkles className="size-3" strokeWidth={2.5} /> Skor = raw ×
            balanceWeight × completionWeight
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="neutral" className="bg-white border-2 font-black">
            <Users className="size-3 mr-1" strokeWidth={2.5} /> Grup{" "}
            {entries.length}
          </Badge>
          <Badge
            variant="neutral"
            className="bg-black text-white border-black font-black"
          >
            Kamu #{selfEntry?.rank ?? "-"}
          </Badge>
        </div>
      </div>

      {/* Self highlight */}
      {selfEntry && (
        <Card className="border-2 shadow-shadow bg-[var(--color-accent)]">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-10 border-2 border-border rounded-none bg-white">
                <AvatarImage src={selfEntry.avatarUrl || undefined} />
                <AvatarFallback className="rounded-none font-black bg-white text-black">
                  {(selfEntry.displayName || "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-heading font-black leading-none">
                  {selfEntry.displayName}{" "}
                  <span className="text-xs bg-black text-white px-1 ml-1">
                    YOU
                  </span>
                </p>
                <p className="text-xs font-bold flex items-center gap-1">
                  <MapPin className="size-3" strokeWidth={2.5} />
                  {selfEntry.city || "-"} • Rank #{selfEntry.rank}
                </p>
              </div>
            </div>
            <div className="flex gap-2 text-xs font-black">
              <div className="border-2 border-border bg-white px-3 py-2 text-center shadow-sm">
                <div className="text-lg leading-none">
                  {selfEntry.leaderboardScore.toFixed(1)}
                </div>
                <div>Score</div>
              </div>
              <div className="border-2 border-border bg-black text-white px-3 py-2 text-center shadow-sm">
                <div className="text-lg leading-none">
                  {selfEntry.balanceIndex.toFixed(0)}
                </div>
                <div>Balance</div>
              </div>
              <div className="border-2 border-border bg-white px-3 py-2 text-center shadow-sm">
                <div className="text-lg leading-none">
                  {(selfEntry.completionRate * 100).toFixed(0)}%
                </div>
                <div>Done</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Podium */}
      {podium.length >= 3 && (
        <div className="grid gap-4 md:grid-cols-3">
          {/* 2nd */}
          <Card className="order-2 md:order-1 border-2 shadow-shadow bg-[var(--neo-gray-100)] flex flex-col items-center p-4 text-center">
            <div className="flex size-10 items-center justify-center border-2 border-border bg-white shadow-sm">
              <Medal className="size-5" strokeWidth={2.5} />
            </div>
            <Badge className="mt-2 bg-white text-black border-black font-black">
              SILVER • #2
            </Badge>
            <Avatar className="mt-3 size-14 border-2 border-border rounded-none">
              <AvatarImage src={podium[1]?.avatarUrl || undefined} />
              <AvatarFallback className="rounded-none font-black text-lg">
                {(podium[1]?.displayName || "?").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="mt-2 font-heading font-black leading-tight">
              {podium[1]?.displayName}
            </p>
            <p className="text-xs font-bold text-foreground/60">
              {podium[1]?.city}
            </p>
            <p className="mt-2 font-black text-lg">
              {podium[1]?.leaderboardScore.toFixed(1)}
            </p>
            <Progress
              value={
                podium[1]
                  ? (podium[1].leaderboardScore / podium[0].leaderboardScore) *
                    100
                  : 0
              }
              className="mt-2 h-2 [&>div]:bg-black"
            />
          </Card>

          {/* 1st */}
          <Card className="order-1 md:order-2 border-2 shadow-shadow bg-[var(--color-accent)] flex flex-col items-center p-4 text-center scale-[1.02]">
            <div className="flex size-12 items-center justify-center border-2 border-border bg-black shadow-sm">
              <Crown
                className="size-6 text-[var(--color-accent)]"
                strokeWidth={2.5}
              />
            </div>
            <Badge className="mt-2 bg-black text-white border-black font-black gap-1">
              <Trophy className="size-3" strokeWidth={2.5} /> GOLD • #1
            </Badge>
            <Avatar className="mt-3 size-16 border-2 border-border rounded-none bg-white">
              <AvatarImage src={podium[0]?.avatarUrl || undefined} />
              <AvatarFallback className="rounded-none font-black text-xl bg-white">
                {(podium[0]?.displayName || "?").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="mt-2 font-heading font-black text-lg leading-tight">
              {podium[0]?.displayName}
            </p>
            <p className="text-xs font-bold">{podium[0]?.city}</p>
            <p className="mt-2 font-black text-xl">
              {podium[0]?.leaderboardScore.toFixed(1)}
            </p>
            <div className="mt-2 flex items-center gap-1 text-xs font-black">
              <BarChart3 className="size-3" strokeWidth={2.5} /> Balance{" "}
              {podium[0]?.balanceIndex.toFixed(0)}
            </div>
          </Card>

          {/* 3rd */}
          <Card className="order-3 border-2 shadow-shadow bg-[var(--color-info)] text-white flex flex-col items-center p-4 text-center">
            <div className="flex size-10 items-center justify-center border-2 border-border bg-white shadow-sm">
              <Award
                className="size-5 text-[var(--color-info)]"
                strokeWidth={2.5}
              />
            </div>
            <Badge className="mt-2 bg-white text-black border-black font-black">
              BRONZE • #3
            </Badge>
            <Avatar className="mt-3 size-14 border-2 border-border rounded-none bg-white">
              <AvatarImage src={podium[2]?.avatarUrl || undefined} />
              <AvatarFallback className="rounded-none font-black text-lg bg-white text-black">
                {(podium[2]?.displayName || "?").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="mt-2 font-heading font-black leading-tight">
              {podium[2]?.displayName}
            </p>
            <p className="text-xs font-bold text-white/80">{podium[2]?.city}</p>
            <p className="mt-2 font-black text-lg">
              {podium[2]?.leaderboardScore.toFixed(1)}
            </p>
            <Progress
              value={
                podium[2]
                  ? (podium[2].leaderboardScore / podium[0].leaderboardScore) *
                    100
                  : 0
              }
              className="mt-2 h-2 bg-white/30 [&>div]:bg-white"
            />
          </Card>
        </div>
      )}

      {isDemo && (
        <Alert className="bg-[var(--color-accent)] text-black border-black">
          <Sparkles className="size-4" strokeWidth={2.5} />
          <AlertTitle className="font-black">
            Mode Demo - Kompetitor dari data palsu
          </AlertTitle>
          <AlertDescription className="font-bold">
            Kamu belum punya skor minggu ini, jadi leaderboard menampilkan 10
            PurrBot Jakarta sebagai contoh. Mulai buat task hari ini, minggu
            depan kamu akan masuk peringkat nyata bersama mereka!
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" strokeWidth={2.5} />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Data table controls */}
      <Card className="border-2 shadow-shadow bg-secondary-background">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-border bg-white">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="size-4" strokeWidth={2.5} /> Tabel Peringkat
            <Badge variant="neutral" className="font-black border-2">
              {filteredSorted.length} peserta
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search
                className="absolute left-2 top-1/2 -translate-y-1/2 size-4"
                strokeWidth={2.5}
              />
              <Input
                placeholder="Cari nama / kota..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 bg-white border-2 font-bold"
              />
            </div>
            <Select
              value={sort}
              onValueChange={(v) => setSort(v as typeof sort)}
            >
              <SelectTrigger className="w-36 bg-white border-2 font-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rank">Rank</SelectItem>
                <SelectItem value="score">Score ↓</SelectItem>
                <SelectItem value="raw">Raw ↓</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[var(--neo-gray-100)] border-b-2">
                  <TableHead className="w-20 font-black">
                    <span className="flex items-center gap-1">
                      <Trophy className="size-3" strokeWidth={2.5} /> Rank
                    </span>
                  </TableHead>
                  <TableHead className="font-black min-w-[180px]">
                    User
                  </TableHead>
                  <TableHead className="text-right font-black">Raw</TableHead>
                  <TableHead className="text-right font-black hidden sm:table-cell">
                    Balance
                  </TableHead>
                  <TableHead className="text-right font-black hidden md:table-cell">
                    Done%
                  </TableHead>
                  <TableHead className="text-right font-black">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 font-bold text-foreground/60"
                    >
                      Tidak ada hasil untuk &quot;{search}&quot;
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((e) => {
                    const isSelf = e.userId === user?.uid;
                    const isTop3 = e.rank <= 3;
                    return (
                      <TableRow
                        key={e.userId}
                        className={
                          isSelf
                            ? "bg-[var(--color-accent)] font-black border-l-4 border-l-black"
                            : isTop3
                              ? "bg-white"
                              : "bg-white"
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex size-7 items-center justify-center border-2 border-border shadow-sm ${e.rank === 1 ? "bg-[var(--color-accent)]" : e.rank === 2 ? "bg-[var(--neo-gray-100)]" : e.rank === 3 ? "bg-[var(--color-info)] text-white" : "bg-white"}`}
                            >
                              {rankIcon(e.rank)}
                            </div>
                            {isSelf && (
                              <Badge className="bg-black text-white border-black text-[10px]">
                                YOU
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="size-8 border-2 border-border rounded-none">
                              <AvatarImage src={e.avatarUrl || undefined} />
                              <AvatarFallback className="rounded-none font-black bg-white text-black text-xs">
                                {(e.displayName || "?")
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-heading font-black text-sm leading-none truncate max-w-[140px]">
                                {e.displayName}
                                {isSelf && " (you)"}
                              </p>
                              <p className="text-xs font-bold text-foreground/60 flex items-center gap-1">
                                <MapPin className="size-3" strokeWidth={2.5} />
                                {e.city || "-"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {e.weeklyRawScore.toFixed(1)}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          <span className="inline-flex items-center gap-1 border-2 border-border bg-white px-2 py-1 text-xs font-black">
                            {e.balanceIndex.toFixed(0)}{" "}
                            <span className="text-foreground/50">
                              • {e.balanceWeight.toFixed(2)}x
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell font-bold">
                          {(e.completionRate * 100).toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`inline-block border-2 border-border px-2 py-1 font-black shadow-sm ${e.rank === 1 ? "bg-[var(--color-accent)] text-black" : e.rank === 2 ? "bg-[var(--neo-gray-100)]" : e.rank === 3 ? "bg-[var(--color-info)] text-white" : "bg-black text-white"}`}
                          >
                            {e.leaderboardScore.toFixed(1)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t-2 border-border bg-[var(--neo-gray-100)] px-4 py-3">
            <p className="text-xs font-black">
              Hal {page + 1} / {totalPages} • {filteredSorted.length} peserta
            </p>
            <div className="flex gap-2">
              <Button
                variant="neutral"
                size="sm"
                className="bg-white font-black gap-1"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="size-4" strokeWidth={2.5} /> Prev
              </Button>
              <Button
                variant="neutral"
                size="sm"
                className="bg-white font-black gap-1"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next <ChevronRight className="size-4" strokeWidth={2.5} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-shadow">
        <CardHeader>
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Award className="size-4" strokeWidth={2.5} /> Badge Tier
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs font-bold space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="border-2 border-border bg-[var(--color-accent)] p-3 flex items-center gap-2 shadow-sm">
              <Trophy className="size-5" strokeWidth={2.5} />{" "}
              <span>Gold Medal Rank 1</span>
            </div>
            <div className="border-2 border-border bg-[var(--neo-gray-100)] p-3 flex items-center gap-2 shadow-sm">
              <Medal className="size-5" strokeWidth={2.5} />{" "}
              <span>Silver Medal Rank 2</span>
            </div>
            <div className="border-2 border-border bg-[var(--color-info)] text-white p-3 flex items-center gap-2 shadow-sm">
              <Award className="size-5" strokeWidth={2.5} />{" "}
              <span>Bronze Medal Rank 3</span>
            </div>
          </div>
          <p className="text-foreground/60 font-bold">
            Badge tersimpan permanen di profile, terikat minggu & grup (DESIGN
            7). Skor = raw × balanceWeight × completionWeight.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
