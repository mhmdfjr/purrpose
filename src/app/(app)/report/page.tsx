"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { getRegenerateSuggestionCallable } from "@/lib/firebase-functions";

type TaskDoc = {
  id: string;
  category: "hustle" | "humble";
  title: string;
  level: number;
  durationHours: number;
  date: string;
  status: "pending" | "completed" | "missed";
  score: number | null;
};

type WeeklyReport = {
  weekId: string;
  startDate: string;
  endDate: string;
  hustleScore: number;
  humbleScore: number;
  totalScore: number;
  balanceIndex: number;
  completedTasksCount: number;
  missedTasksCount: number;
  completionRate: number;
  ruleBasedSuggestion: string;
  aiSuggestion: string | null;
};

function todayStr() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

function getCurrentWeekId(): string {
  // ISO week for today UTC
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export default function ReportPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState(todayStr());
  const [tasks, setTasks] = React.useState<TaskDoc[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState("daily");

  // Weekly state
  const [weekly, setWeekly] = React.useState<WeeklyReport | null>(null);
  const [weeklyLoading, setWeeklyLoading] = React.useState(false);
  const [weekIdInput, setWeekIdInput] = React.useState(getCurrentWeekId());
  const [regenLoading, setRegenLoading] = React.useState(false);

  const loadDaily = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const col = collection(db, `users/${user.uid}/tasks`);
      const q = query(col, where("date", "==", selectedDate));
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TaskDoc, "id">) }));
      setTasks(docs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate]);

  const loadWeekly = React.useCallback(async () => {
    if (!user) return;
    setWeeklyLoading(true);
    setError(null);
    try {
      const ref = doc(db, `users/${user.uid}/weeklyReports/${weekIdInput}`);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setWeekly(null);
      } else {
        setWeekly(snap.data() as WeeklyReport);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load weekly report");
    } finally {
      setWeeklyLoading(false);
    }
  }, [user, weekIdInput]);

  React.useEffect(() => {
    if (tab === "daily") void loadDaily();
  }, [loadDaily, tab]);
  React.useEffect(() => {
    if (tab === "weekly") void loadWeekly();
  }, [loadWeekly, tab]);

  const hustle = tasks.filter((t) => t.category === "hustle");
  const humble = tasks.filter((t) => t.category === "humble");
  const hustleScore = tasks.filter((t) => t.category === "hustle" && t.status === "completed").reduce((s, t) => s + (t.score || 0), 0);
  const humbleScore = tasks.filter((t) => t.category === "humble" && t.status === "completed").reduce((s, t) => s + (t.score || 0), 0);
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const missedCount = tasks.filter((t) => t.status === "missed").length;

  const renderList = (list: TaskDoc[]) =>
    list.length === 0 ? (
      <div className="text-center py-4 border-2 border-dashed border-border bg-[var(--neo-gray-100)]">
        <p className="text-sm font-bold">Belum ada task</p>
        <p className="text-xs text-muted-foreground mt-1">Tambahkan task Hustle atau Humble — mulai kecil tidak apa-apa.</p>
      </div>
    ) : (
      <div className="space-y-2">
        {list.map((t) => (
          <div key={t.id} className="flex items-center justify-between border-2 border-border p-2 bg-background text-sm">
            <div>
              <p className={`font-bold ${t.status === "completed" ? "line-through opacity-70" : ""}`}>{t.title}</p>
              <p className="text-xs">Lv {t.level} • {t.durationHours}h {t.score !== null ? `• Score ${t.score}` : ""}</p>
            </div>
            <Badge variant="neutral" className={t.status === "completed" ? "bg-[var(--color-humble)] text-white" : t.status === "missed" ? "bg-[var(--neo-gray-100)]" : "bg-white"}>
              {t.status}
            </Badge>
          </div>
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-heading font-black">Report</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-heading font-bold">Daily Report</h2>
            <div className="flex items-center gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Direct query — no precomputed collection per DATABASE.md:10. Factual summary per PRD 7.1.</p>
          {error && <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 p-2">{error}</div>}
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Hustle Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-black" style={{ color: "var(--color-hustle)" }}>{hustleScore.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">{hustle.length} tasks • {hustle.filter((t) => t.status === "completed").length} completed</p>
                  </CardContent>
                </Card>
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Humble Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-black" style={{ color: "var(--color-humble)" }}>{humbleScore.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">{humble.length} tasks • {humble.filter((t) => t.status === "completed").length} completed</p>
                  </CardContent>
                </Card>
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-bold">Pending: {pendingCount} • Completed: {completedCount} • Missed: {missedCount}</p>
                    <p className="text-xs text-muted-foreground">Missed auto by hourly job (cutover at local midnight ±1h)</p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-[var(--color-hustle)]">
                  <CardHeader>
                    <CardTitle className="text-[var(--color-hustle)]">HUSTLE</CardTitle>
                  </CardHeader>
                  <CardContent>{renderList(hustle)}</CardContent>
                </Card>
                <Card className="border-[var(--color-humble)]">
                  <CardHeader>
                    <CardTitle className="text-[var(--color-humble)]">HUMBLE</CardTitle>
                  </CardHeader>
                  <CardContent>{renderList(humble)}</CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-heading font-bold">Weekly Report</h2>
            <div className="flex items-center gap-2">
              <Label htmlFor="weekId">Week ID</Label>
              <Input id="weekId" value={weekIdInput} onChange={(e) => setWeekIdInput(e.target.value)} placeholder="2026-W36" className="w-36" />
              <Button variant="neutral" size="sm" onClick={() => void loadWeekly()}>Load</Button>
            </div>
          </div>

          {weeklyLoading ? (
            <p>Loading weekly report...</p>
          ) : !weekly ? (
            <Card className="border-2 border-dashed">
              <CardContent className="pt-6 text-center">
                <p className="text-sm font-bold">Belum ada laporan untuk {weekIdInput}</p>
                <p className="text-xs text-muted-foreground mt-1">Laporan mingguan dibuat otomatis tiap Senin 00:00 UTC. Jika minggu ini masih berjalan, cek kembali setelah Senin — atau coba minggu sebelumnya. Insight di sini bukan penilaian, hanya refleksi untuk minggu depan.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Balance Index</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-black">{weekly.balanceIndex.toFixed(0)}<span className="text-sm font-normal">/100</span></p>
                    {/* Gauge per DESIGN 6.2: gradient Rose to Green */}
                    <div className="mt-3 h-3 w-full border-2 border-border relative overflow-hidden" style={{ background: "linear-gradient(90deg, var(--color-hustle) 0%, var(--color-humble) 100%)" }}>
                      <div className="absolute top-0 bottom-0 w-1 bg-black border border-white" style={{ left: `calc(${weekly.balanceIndex}% - 2px)` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{weekly.startDate} → {weekly.endDate} • Ideal 50:50 (humble {((weekly.humbleScore / (weekly.totalScore || 1)) * 100).toFixed(0)}%)</p>
                  </CardContent>
                </Card>
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Scores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xl font-black" style={{ color: "var(--color-hustle)" }}>{weekly.hustleScore.toFixed(1)}</p>
                        <p className="text-xs">Hustle</p>
                      </div>
                      <div>
                        <p className="text-xl font-black" style={{ color: "var(--color-humble)" }}>{weekly.humbleScore.toFixed(1)}</p>
                        <p className="text-xs">Humble</p>
                      </div>
                      <div>
                        <p className="text-xl font-black">{weekly.totalScore.toFixed(1)}</p>
                        <p className="text-xs">Total</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Completed {weekly.completedTasksCount} • Missed {weekly.missedTasksCount} • Rate {(weekly.completionRate * 100).toFixed(0)}%</p>
                  </CardContent>
                </Card>
                <Card className="border-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Meta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-bold">{weekly.weekId}</p>
                    <p className="text-xs text-muted-foreground">{weekly.startDate} to {weekly.endDate} (Mon-Sun UTC)</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-[var(--color-accent)] border-2 bg-[var(--neo-white)]">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Suggestion
                    {weekly.aiSuggestion && <Badge variant="neutral" className="bg-[var(--color-accent)] text-black text-[10px]">AI Enhanced</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed">{weekly.ruleBasedSuggestion}</p>
                  {weekly.aiSuggestion && (
                    <>
                      <div className="border-t-2 border-border my-2" />
                      <p className="text-sm leading-relaxed italic">{weekly.aiSuggestion}</p>
                    </>
                  )}
                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      variant="neutral"
                      size="sm"
                      disabled={regenLoading || weeklyLoading}
                      onClick={async () => {
                        if (!weekly) return;
                        setError(null);
                        setRegenLoading(true);
                        try {
                          const regen = getRegenerateSuggestionCallable();
                          const res = await regen({ weekId: weekly.weekId });
                          setWeekly((prev) => (prev ? { ...prev, aiSuggestion: (res.data as { aiSuggestion: string }).aiSuggestion } : prev));
                        } catch (e: unknown) {
                          const msg = (e as { message?: string }).message || "Regenerate failed";
                          setError(msg);
                        } finally {
                          setRegenLoading(false);
                        }
                      }}
                    >
                      {regenLoading ? "Generating..." : weekly?.aiSuggestion ? "Regenerate AI" : "Generate AI Suggestion"}
                    </Button>
                    <span className="text-xs text-muted-foreground">Gemini free-tier, cached once, cooldown 1h</span>
                  </div>
                  {error && <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 p-2">{error}</div>}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
