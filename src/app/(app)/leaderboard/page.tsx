"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { Trophy, Medal, Award } from "lucide-react";

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

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [cycleId, setCycleId] = React.useState<string | null>(null);
  const [groupId, setGroupId] = React.useState<string | null>(null);
  const [group, setGroup] = React.useState<GroupDoc | null>(null);
  const [entries, setEntries] = React.useState<(Entry & { displayName?: string; avatarUrl?: string | null; city?: string })[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
      const uData = userSnap.data() as { currentGroupId?: string | null; currentCycleId?: string | null };
      let cId = uData.currentCycleId || null;
      let gId = uData.currentGroupId || null;

      // Fallback: if not stored, try to find latest cycle that has this user in entries via brute force (expensive but for small dev)
      // For now if no currentGroupId, try to list latest cycle
      if (!cId || !gId) {
        // Find latest completed cycle
        const cyclesCol = collection(db, "leaderboardCycles");
        const cyclesSnap = await getDocs(cyclesCol);
        if (!cyclesSnap.empty) {
          const cycles = cyclesSnap.docs.map((d) => ({ id: d.id, ...(d.data() as { weekId: string }) }));
          cycles.sort((a, b) => b.id.localeCompare(a.id));
          for (const c of cycles) {
            const groupsCol = collection(db, `leaderboardCycles/${c.id}/groups`);
            const groupsSnap = await getDocs(groupsCol);
            for (const gDoc of groupsSnap.docs) {
              const entryRef = doc(db, `leaderboardCycles/${c.id}/groups/${gDoc.id}/entries/${user.uid}`);
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
        setCycleId(null);
        setGroupId(null);
        setEntries([]);
        setLoading(false);
        return;
      }
      setCycleId(cId);
      setGroupId(gId);

      const groupRef = doc(db, `leaderboardCycles/${cId}/groups/${gId}`);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) setGroup(groupSnap.data() as GroupDoc);
      else setGroup(null);

      const entriesCol = collection(db, `leaderboardCycles/${cId}/groups/${gId}/entries`);
      const entriesQ = query(entriesCol, orderBy("rank", "asc"));
      const entriesSnap = await getDocs(entriesQ);
      const list: (Entry & { displayName?: string; avatarUrl?: string | null; city?: string })[] = [];

      for (const eDoc of entriesSnap.docs) {
        const entry = eDoc.data() as Entry;
        // Fetch user profile for display (could be batched but simple loop for small group 15)
        try {
          const profSnap = await getDoc(doc(db, "users", entry.userId));
          const prof = profSnap.exists() ? (profSnap.data() as { displayName?: string; avatarUrl?: string | null; city?: string }) : {};
          list.push({ ...entry, displayName: prof.displayName || entry.userId.slice(0, 6), avatarUrl: prof.avatarUrl || null, city: prof.city });
        } catch {
          list.push(entry);
        }
      }
      // Ensure sorted by rank
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

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-[var(--color-accent)]" strokeWidth={2.5} />;
    if (rank === 2) return <Medal className="h-4 w-4" strokeWidth={2.5} />;
    if (rank === 3) return <Award className="h-4 w-4 text-[var(--color-info)]" strokeWidth={2.5} />;
    return null;
  };

  if (loading) return <p className="p-4">Loading leaderboard...</p>;

  if (!cycleId || !groupId || entries.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-heading font-black">Leaderboard</h1>
        <Card className="border-2 border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Belum ada leaderboard untukmu minggu ini. Leaderboard terbentuk otomatis tiap Senin 00:00 UTC (weeklyCycleJob). Pastikan kamu sudah punya weekly report (buat task minggu lalu). Jika kamu di kota sepi, grup mungkin kecil (fallback province per PRD 8.2).</p>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-black">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grup: <span className="font-bold">{group?.locationName || groupId}</span> {group?.locationLevel === "province" && <span className="text-xs bg-[var(--neo-gray-100)] border border-border px-1 ml-1">(fallback province)</span>} • Minggu {cycleId} • {group?.memberCount} peserta
        </p>
        <p className="text-xs text-muted-foreground">Skor = raw × balanceWeight × completionWeight (balanceIndex & completionRate). Top 3 dapat badge.</p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 p-2">{error}</div>}

      <Card className="border-2 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary-background">
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Raw</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Balance</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => {
              const isSelf = e.userId === user?.uid;
              return (
                <TableRow
                  key={e.userId}
                  className={
                    isSelf
                      ? "bg-[var(--neo-gray-100)] border-l-4 border-l-[var(--color-accent)] font-bold"
                      : "bg-white"
                  }
                >
                  <TableCell className="flex items-center gap-2">
                    {rankIcon(e.rank)}
                    <span>#{e.rank}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {e.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.avatarUrl} alt={e.displayName} className="h-6 w-6 border border-border" />
                      ) : (
                        <div className="h-6 w-6 bg-[var(--neo-gray-100)] border border-border flex items-center justify-center text-[10px]">?</div>
                      )}
                      <div>
                        <p className="text-sm leading-none">{e.displayName}{isSelf && " (you)"}</p>
                        <p className="text-[10px] text-muted-foreground">{e.city || ""}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{e.weeklyRawScore.toFixed(1)}</TableCell>
                  <TableCell className="text-right hidden sm:table-cell">{e.balanceIndex.toFixed(0)} • {(e.completionRate * 100).toFixed(0)}%</TableCell>
                  <TableCell className="text-right font-black">{e.leaderboardScore.toFixed(1)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-sm">Badge Tier</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <p className="flex items-center gap-2"><Trophy className="h-4 w-4" strokeWidth={2.5} /> Gold Rank 1 — Yellow bg + trophy</p>
          <p className="flex items-center gap-2"><Medal className="h-4 w-4" strokeWidth={2.5} /> Silver Rank 2 — Gray bg + medal</p>
          <p className="flex items-center gap-2"><Award className="h-4 w-4" strokeWidth={2.5} /> Bronze Rank 3 — Blue bg + award</p>
          <p className="text-muted-foreground mt-2">Badge tersimpan permanen di profile, terikat minggu & grup (DESIGN 7). Tidak ada variasi streak di MVP.</p>
        </CardContent>
      </Card>
    </div>
  );
}
