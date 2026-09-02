"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { useAuth } from "@/lib/auth/AuthContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { getRegenerateSuggestionCallable } from "@/lib/firebase-functions";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  CalendarIcon,
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Briefcase,
  BedDouble,
  Trophy,
  RefreshCw,
  Inbox,
} from "lucide-react";

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
  const now = new Date();
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function parseDateStr(s: string): Date {
  return parseISO(s + "T12:00:00");
}

export default function ReportPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState(todayStr());
  const [tasks, setTasks] = React.useState<TaskDoc[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState("daily");
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const [weekly, setWeekly] = React.useState<WeeklyReport | null>(null);
  const [weeklyHistory, setWeeklyHistory] = React.useState<WeeklyReport[]>([]);
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
      const docs = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TaskDoc, "id">),
      }));
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
      // also load history for trend (last 4)
      try {
        const col = collection(db, `users/${user.uid}/weeklyReports`);
        const qh = query(col, orderBy("startDate", "desc"), limit(4));
        const hs = await getDocs(qh);
        const list = hs.docs
          .map((d) => d.data() as WeeklyReport)
          .sort((a, b) => a.startDate.localeCompare(b.startDate));
        setWeeklyHistory(list);
      } catch {
        setWeeklyHistory(weekly ? [weekly] : []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load weekly report");
    } finally {
      setWeeklyLoading(false);
    }
  }, [user, weekIdInput, weekly]);

  React.useEffect(() => {
    if (tab === "daily") void loadDaily();
  }, [loadDaily, tab]);
  React.useEffect(() => {
    if (tab === "weekly") void loadWeekly();
  }, [loadWeekly, tab]);

  const hustle = tasks.filter((t) => t.category === "hustle");
  const humble = tasks.filter((t) => t.category === "humble");
  const hustleScore = tasks
    .filter((t) => t.category === "hustle" && t.status === "completed")
    .reduce((s, t) => s + (t.score || 0), 0);
  const humbleScore = tasks
    .filter((t) => t.category === "humble" && t.status === "completed")
    .reduce((s, t) => s + (t.score || 0), 0);
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const missedCount = tasks.filter((t) => t.status === "missed").length;
  const completionRate = tasks.length ? completedCount / tasks.length : 0;

  const selectedDateObj = React.useMemo(
    () => parseDateStr(selectedDate),
    [selectedDate],
  );

  // Chart data: daily tasks bar (per task)
  const dailyBarData = tasks.slice(0, 8).map((t) => ({
    name: t.title.slice(0, 10) + (t.title.length > 10 ? "…" : ""),
    hustle:
      t.category === "hustle" ? (t.score ?? t.level * t.durationHours) : 0,
    humble:
      t.category === "humble" ? (t.score ?? t.level * t.durationHours) : 0,
  }));
  const dailyBarConfig = {
    hustle: { label: "Hustle", color: "#FF0052" },
    humble: { label: "Humble", color: "#00C68D" },
  };

  const levelData = [1, 2, 3, 4, 5].map((lvl) => ({
    level: `Lv ${lvl}`,
    hustle: tasks.filter((t) => t.level === lvl && t.category === "hustle").length,
    humble: tasks.filter((t) => t.level === lvl && t.category === "humble").length,
  }));
  const levelConfig = {
    hustle: { label: "Hustle", color: "#FF0052" },
    humble: { label: "Humble", color: "#00C68D" },
  } satisfies Record<string, { label: string; color: string }>;

  const pieData = [
    { name: "Hustle", value: hustleScore || 0, fill: "#FF0052" },
    { name: "Humble", value: humbleScore || 0, fill: "#00C68D" },
    { name: "Pending", value: pendingCount, fill: "#F2F2F2" },
  ].filter((d) => d.value > 0);
  const pieConfig = {
    hustle: { label: "Hustle", color: "#FF0052" },
    humble: { label: "Humble", color: "#00C68D" },
    pending: { label: "Pending", color: "#F2F2F2" },
  };

  const weeklyTrendData = weeklyHistory.map((w) => ({
    week: w.weekId.slice(-2),
    hustle: w.hustleScore,
    humble: w.humbleScore,
    balance: w.balanceIndex,
  }));
  const weeklyTrendConfig = {
    hustle: { label: "Hustle", color: "#FF0052" },
    humble: { label: "Humble", color: "#00C68D" },
    balance: { label: "Balance", color: "#0055DA" },
  };

  const renderList = (list: TaskDoc[]) =>
    list.length === 0 ? (
      <div className="text-center py-6 border-2 border-dashed border-border bg-(--neo-gray-100)">
        <Inbox className="mx-auto size-6 text-foreground/40" strokeWidth={2} />
        <p className="text-sm font-black mt-2">Belum ada task</p>
        <p className="text-xs text-foreground/60 mt-1">
          Tambahkan task Hustle atau Humble, mulai kecil tidak apa-apa.
        </p>
      </div>
    ) : (
      <div className="space-y-2">
        {list.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between border-2 border-border p-2 bg-white text-sm shadow-sm"
          >
            <div className="min-w-0">
              <p
                className={`font-heading font-black leading-tight truncate ${t.status === "completed" ? "line-through opacity-70" : ""}`}
              >
                {t.title}
              </p>
              <p className="text-xs font-bold">
                Lv {t.level} • {t.durationHours}h{" "}
                {t.score !== null ? `• Score ${t.score}` : ""} • {t.date}
              </p>
            </div>
            <Badge
              variant="neutral"
              className={`shrink-0 ml-2 font-black border-2 text-xs ${t.status === "completed" ? "bg-black text-white" : t.status === "missed" ? "bg-(--neo-gray-100)" : "bg-white"}`}
            >
              {t.status}
            </Badge>
          </div>
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-black flex items-center gap-2">
            <BarChart3 className="size-7" strokeWidth={2.5} /> Report
          </h1>
          <p className="text-sm text-foreground/60 font-bold">
            Ringkasan informatif harian & mingguan dari tasks kamu.
          </p>
        </div>
        <Badge
          variant="neutral"
          className="w-fit font-black border-2 bg-accent text-black"
        >
          <Sparkles className="size-3 mr-1" strokeWidth={2.5} />{" "}
          {tab === "daily" ? "DAILY VIEW" : "WEEKLY VIEW"}
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
          <TabsTrigger value="daily" className="gap-1.5">
            <Clock3 className="size-4" strokeWidth={2.5} /> Daily
          </TabsTrigger>
          <TabsTrigger value="weekly" className="gap-1.5">
            <Trophy className="size-4" strokeWidth={2.5} /> Weekly
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-heading font-black">Daily Report</h2>
            <div className="flex items-center gap-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="neutral" className="font-bold gap-2">
                    <CalendarIcon className="size-4" strokeWidth={2.5} />{" "}
                    {format(selectedDateObj, "d MMM yyyy", {
                      locale: localeId,
                    })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 border-0 bg-transparent shadow-none w-auto"
                  align="end"
                >
                  <Calendar
                    mode="single"
                    selected={selectedDateObj}
                    onSelect={(d) => {
                      if (d) {
                        const localIso = new Date(
                          d.getTime() - d.getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 10);
                        setSelectedDate(localIso);
                        setCalendarOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="neutral"
                className="font-bold"
                onClick={() => setSelectedDate(todayStr())}
              >
                Hari ini
              </Button>
            </div>
          </div>

          <p className="text-xs text-foreground/60 border-l-4 border-accent pl-3">
            Saran dari sistem ini bisa kamu gunakan sebagai referensi, bukan
            aturan baku. Hal-hal terkait medis atau psikologis sebaiknya
            dikonsultasikan dengan profesional.
          </p>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" strokeWidth={2.5} />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32 border-2 border-border" />
              ))}
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-2 shadow-shadow bg-secondary-background">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black tracking-widest flex items-center gap-1 text-hustle">
                      <Briefcase className="size-3" strokeWidth={2.5} /> HUSTLE
                      SCORE
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      className="text-3xl font-black"
                      style={{ color: "var(--color-hustle)" }}
                    >
                      {hustleScore.toFixed(1)}
                    </p>
                    <p className="text-xs font-bold text-foreground/60">
                      {hustle.length} tasks •{" "}
                      {hustle.filter((t) => t.status === "completed").length}{" "}
                      completed
                    </p>
                    <Progress
                      value={
                        hustle.length
                          ? (hustle.filter((t) => t.status === "completed")
                              .length /
                              hustle.length) *
                            100
                          : 0
                      }
                      className="mt-2 h-2 [&>div]:bg-hustle"
                    />
                  </CardContent>
                </Card>
                <Card className="border-2 shadow-shadow bg-secondary-background">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black tracking-widest flex items-center gap-1 text-humble">
                      <BedDouble className="size-3" strokeWidth={2.5} /> HUMBLE
                      SCORE
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      className="text-3xl font-black"
                      style={{ color: "var(--color-humble)" }}
                    >
                      {humbleScore.toFixed(1)}
                    </p>
                    <p className="text-xs font-bold text-foreground/60">
                      {humble.length} tasks •{" "}
                      {humble.filter((t) => t.status === "completed").length}{" "}
                      completed
                    </p>
                    <Progress
                      value={
                        humble.length
                          ? (humble.filter((t) => t.status === "completed")
                              .length /
                              humble.length) *
                            100
                          : 0
                      }
                      className="mt-2 h-2 [&>div]:bg-humble"
                    />
                  </CardContent>
                </Card>
                <Card className="border-2 shadow-shadow bg-accent">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black tracking-widest flex items-center gap-1">
                      <CheckCircle2 className="size-3" strokeWidth={2.5} />{" "}
                      STATUS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-black">
                      Pending: {pendingCount} • Selesai: {completedCount} •
                      Missed: {missedCount}
                    </p>
                    <Progress
                      value={completionRate * 100}
                      className="mt-2 h-2 [&>div]:bg-black"
                    />
                    <p className="text-xs font-bold mt-1">
                      Completion {(completionRate * 100).toFixed(0)}% • Missed
                      auto cutover midnight ±1h
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts row */}
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="border-2 shadow-shadow bg-secondary-background lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                      <BarChart3 className="size-4" strokeWidth={2.5} /> Skor
                      per Task (Top 8)
                    </CardTitle>
                    <CardDescription className="font-bold text-xs">
                      Hustle rose vs Humble green.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {dailyBarData.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-border bg-(--neo-gray-100) font-bold text-sm">
                        Belum ada data untuk chart
                      </div>
                    ) : (
                      <ChartContainer
                        config={dailyBarConfig}
                        className="h-60 w-full"
                      >
                        <BarChart data={dailyBarData} barGap={4}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="var(--border)"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fontWeight: 700 }}
                            interval={0}
                            angle={-12}
                            textAnchor="end"
                            height={50}
                          />
                          <YAxis tick={{ fontSize: 11 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <ChartLegend
                            content={<ChartLegendContent payload={undefined} />}
                          />
                          <Bar
                            dataKey="hustle"
                            fill="var(--color-hustle)"
                            radius={0}
                            stroke="var(--border)"
                            strokeWidth={2}
                          />
                          <Bar
                            dataKey="humble"
                            fill="var(--color-humble)"
                            radius={0}
                            stroke="var(--border)"
                            strokeWidth={2}
                          />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-2 shadow-shadow bg-secondary-background">
                  <CardHeader>
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                      <PieIcon className="size-4" strokeWidth={2.5} />{" "}
                      Distribusi Skor
                    </CardTitle>
                    <CardDescription className="font-bold text-xs">
                      Hustle rose, Humble green, Pending gray.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pieData.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-border bg-(--neo-gray-100) font-bold text-sm">
                        Belum ada skor
                      </div>
                    ) : (
                      <ChartContainer
                        config={pieConfig}
                        className="h-60 w-full"
                      >
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={80}
                            stroke="var(--border)"
                            strokeWidth={2}
                          >
                            {pieData.map((entry, idx) => (
                              <Cell key={idx} fill={entry.fill} />
                            ))}
                          </Pie>
                          <ChartTooltip
                            content={<ChartTooltipContent hideLabel />}
                          />
                          <ChartLegend
                            content={<ChartLegendContent payload={undefined} />}
                          />
                        </PieChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-2 shadow-shadow bg-secondary-background">
                <CardHeader>
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <TrendingUp className="size-4" strokeWidth={2.5} /> Distribusi Level (1–5)
                  </CardTitle>
                  <CardDescription className="font-bold text-xs">
                    Hustle rose • Humble green — stacked neobrutalism
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={levelConfig} className="h-[220px] w-full">
                    <AreaChart accessibilityLayer data={levelData} margin={{ left: 12, right: 12 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis dataKey="level" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 12, fontWeight: 700 }} />
                      <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fontSize: 12 }} />
                      <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                      <Area
                        dataKey="humble"
                        type="natural"
                        fill="var(--color-humble)"
                        stroke="var(--color-humble)"
                        stackId="a"
                        strokeWidth={2}
                        fillOpacity={0.9}
                        activeDot={{ fill: "var(--chart-active-dot)", stroke: "var(--border)", strokeWidth: 2 }}
                      />
                      <Area
                        dataKey="hustle"
                        type="natural"
                        fill="var(--color-hustle)"
                        stroke="var(--color-hustle)"
                        stackId="a"
                        strokeWidth={2}
                        fillOpacity={0.9}
                        activeDot={{ fill: "var(--chart-active-dot)", stroke: "var(--border)", strokeWidth: 2 }}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-hustle border-2 shadow-shadow">
                  <CardHeader className="border-b-2 border-border bg-white flex flex-row items-center justify-between">
                    <CardTitle className="text-hustle flex items-center gap-2">
                      <Briefcase className="size-4" strokeWidth={2.5} /> HUSTLE
                    </CardTitle>
                    <Badge className="bg-hustle text-white border-black font-black">
                      {hustle.length}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {renderList(hustle)}
                  </CardContent>
                </Card>
                <Card className="border-humble border-2 shadow-shadow">
                  <CardHeader className="border-b-2 border-border bg-white flex flex-row items-center justify-between">
                    <CardTitle className="text-humble flex items-center gap-2">
                      <BedDouble className="size-4" strokeWidth={2.5} /> HUMBLE
                    </CardTitle>
                    <Badge className="bg-humble text-black border-black font-black">
                      {humble.length}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {renderList(humble)}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-heading font-black">Weekly Report</h2>
            <div className="flex items-center gap-2">
              <Label htmlFor="weekId" className="text-xs font-black">
                Week ID
              </Label>
              <Input
                id="weekId"
                value={weekIdInput}
                onChange={(e) => setWeekIdInput(e.target.value)}
                placeholder="2026-W36"
                className="w-36 bg-white border-2 font-bold"
              />
              <Button
                variant="neutral"
                size="sm"
                className="bg-white font-black"
                onClick={() => void loadWeekly()}
              >
                <RefreshCw className="size-3.5 mr-1" strokeWidth={2.5} /> Load
              </Button>
            </div>
          </div>

          {weeklyLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-32 border-2 border-border" />
              ))}
            </div>
          ) : !weekly ? (
            <Card className="border-2 border-dashed shadow-shadow">
              <CardContent className="pt-6 text-center">
                <Inbox
                  className="mx-auto size-8 text-foreground/30"
                  strokeWidth={2}
                />
                <p className="text-sm font-black mt-2">
                  Belum ada laporan untuk {weekIdInput}
                </p>
                <p className="text-xs font-bold text-foreground/60 mt-1 max-w-xl mx-auto">
                  Laporan mingguan dibuat otomatis tiap Senin 00:00 UTC. Jika
                  minggu ini masih berjalan, cek kembali setelah Senin — atau
                  coba minggu sebelumnya. Insight di sini bukan penilaian, hanya
                  refleksi.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-2 shadow-shadow bg-secondary-background">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black tracking-widest flex items-center gap-1">
                      <BarChart3 className="size-3" strokeWidth={2.5} /> BALANCE
                      INDEX
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-black">
                      {weekly.balanceIndex.toFixed(0)}
                      <span className="text-sm font-bold">/100</span>
                    </p>
                    <div
                      className="mt-3 h-4 w-full border-2 border-border relative overflow-hidden"
                      style={{
                        background:
                          "linear-gradient(90deg, var(--color-hustle) 0%, var(--color-humble) 100%)",
                      }}
                    >
                      <div
                        className="absolute top-0 bottom-0 w-1.5 bg-black border border-white shadow-sm"
                        style={{ left: `calc(${weekly.balanceIndex}% - 3px)` }}
                      />
                    </div>
                    <p className="text-xs font-bold text-foreground/60 mt-2">
                      {weekly.startDate} → {weekly.endDate} • Ideal 50:50
                      (humble{" "}
                      {(
                        (weekly.humbleScore / (weekly.totalScore || 1)) *
                        100
                      ).toFixed(0)}
                      %)
                    </p>
                    <Progress
                      value={weekly.balanceIndex}
                      className="mt-2 h-2 [&>div]:bg-black"
                    />
                  </CardContent>
                </Card>
                <Card className="border-2 shadow-shadow bg-secondary-background">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black tracking-widest">
                      SCORES
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4">
                      <div className="border-2 border-border bg-hustle text-white px-3 py-2 text-center shadow-sm">
                        <p className="text-xl font-black">
                          {weekly.hustleScore.toFixed(1)}
                        </p>
                        <p className="text-xs font-black">Hustle</p>
                      </div>
                      <div className="border-2 border-border bg-humble text-black px-3 py-2 text-center shadow-sm">
                        <p className="text-xl font-black">
                          {weekly.humbleScore.toFixed(1)}
                        </p>
                        <p className="text-xs font-black">Humble</p>
                      </div>
                      <div className="border-2 border-border bg-accent text-black px-3 py-2 text-center shadow-sm">
                        <p className="text-xl font-black">
                          {weekly.totalScore.toFixed(1)}
                        </p>
                        <p className="text-xs font-black">Total</p>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-foreground/60 mt-3">
                      Completed {weekly.completedTasksCount} • Missed{" "}
                      {weekly.missedTasksCount} • Rate{" "}
                      {(weekly.completionRate * 100).toFixed(0)}%
                    </p>
                    <Progress
                      value={weekly.completionRate * 100}
                      className="mt-1 h-2 [&>div]:bg-info"
                    />
                  </CardContent>
                </Card>
                <Card className="border-2 shadow-shadow bg-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black tracking-widest">
                      META
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-black border-2 border-border bg-accent px-2 py-1 inline-block shadow-sm">
                      {weekly.weekId}
                    </p>
                    <p className="text-xs font-bold text-foreground/60 mt-2">
                      {weekly.startDate} to {weekly.endDate} (Mon-Sun UTC)
                    </p>
                    <div className="mt-3 flex gap-2 text-xs font-black">
                      <span className="border-2 border-border bg-(--neo-gray-100) px-2 py-1">
                        {weekly.completedTasksCount} done
                      </span>
                      <span className="border-2 border-border bg-black text-white px-2 py-1">
                        {weekly.missedTasksCount} missed
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Weekly charts */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-2 shadow-shadow bg-secondary-background">
                  <CardHeader>
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                      <BarChart3 className="size-4" strokeWidth={2.5} /> Hustle
                      vs Humble (minggu ini)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        hustle: {
                          label: "Hustle",
                          color: "#FF0052",
                        },
                        humble: {
                          label: "Humble",
                          color: "#00C68D",
                        },
                      }}
                      className="h-65 w-full"
                    >
                      <BarChart
                        data={[
                          {
                            name: weekly.weekId,
                            hustle: weekly.hustleScore,
                            humble: weekly.humbleScore,
                          },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontWeight: 700 }} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="hustle"
                          fill="var(--color-hustle)"
                          stroke="var(--border)"
                          strokeWidth={2}
                        />
                        <Bar
                          dataKey="humble"
                          fill="var(--color-humble)"
                          stroke="var(--border)"
                          strokeWidth={2}
                        />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <Card className="border-2 shadow-shadow bg-secondary-background">
                  <CardHeader>
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                      <PieIcon className="size-4" strokeWidth={2.5} /> Komposisi
                      Skor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        hustle: {
                          label: "Hustle",
                          color: "#FF0052",
                        },
                        humble: {
                          label: "Humble",
                          color: "#00C68D",
                        },
                      }}
                      className="h-65 w-full"
                    >
                      <PieChart>
                        <Pie
                          data={[
                            {
                              name: "Hustle",
                              value: weekly.hustleScore,
                              fill: "#FF0052",
                            },
                            {
                              name: "Humble",
                              value: weekly.humbleScore,
                              fill: "#00C68D",
                            },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={60}
                          outerRadius={90}
                          stroke="var(--border)"
                          strokeWidth={2}
                          label={({ name, percent }) => {
                            const pct =
                              typeof percent === "number" ? percent : 0;
                            return `${name} ${(pct * 100).toFixed(0)}%`;
                          }}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              </div>

              {weeklyHistory.length > 1 && (
                <Card className="border-2 shadow-shadow bg-secondary-background">
                  <CardHeader>
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                      <TrendingUp className="size-4" strokeWidth={2.5} /> Tren 4
                      Minggu — Balance & Skor
                    </CardTitle>
                    <CardDescription className="font-bold text-xs">
                      Neobrutalism area stacked — border 2px
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={weeklyTrendConfig}
                      className="h-65 w-full"
                    >
                      <AreaChart data={weeklyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" tick={{ fontWeight: 700 }} />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <ChartLegend
                          content={<ChartLegendContent payload={undefined} />}
                        />
                        <Area
                          type="monotone"
                          dataKey="hustle"
                          stackId="a"
                          stroke="var(--color-hustle)"
                          fill="var(--color-hustle)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="humble"
                          stackId="a"
                          stroke="var(--color-humble)"
                          fill="var(--color-humble)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}

              <Card className="border-accent border-2 bg-(--neo-white) shadow-shadow">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 font-black">
                    Saran Mingguan
                    {weekly.aiSuggestion && (
                      <Badge className="bg-accent text-black border-black font-black text-xs gap-1">
                        <Sparkles className="size-3" strokeWidth={2.5} /> AI
                        Enhanced
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="border-2 border-border bg-(--neo-gray-100) p-3">
                    <p className="text-sm leading-relaxed font-bold">
                      {weekly.ruleBasedSuggestion}
                    </p>
                  </div>
                  {weekly.aiSuggestion && (
                    <div className="border-2 border-border bg-white p-3">
                      <p className="text-sm leading-relaxed italic">
                        “{weekly.aiSuggestion}”
                      </p>
                    </div>
                  )}
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <Button
                      variant="neutral"
                      size="sm"
                      className="bg-white font-black gap-1.5"
                      disabled={regenLoading || weeklyLoading}
                      onClick={async () => {
                        if (!weekly) return;
                        setError(null);
                        setRegenLoading(true);
                        try {
                          const regen = getRegenerateSuggestionCallable();
                          const res = await regen({ weekId: weekly.weekId });
                          setWeekly((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  aiSuggestion: (
                                    res.data as { aiSuggestion: string }
                                  ).aiSuggestion,
                                }
                              : prev,
                          );
                        } catch (e: unknown) {
                          const msg =
                            (e as { message?: string }).message ||
                            "Regenerate failed";
                          setError(msg);
                        } finally {
                          setRegenLoading(false);
                        }
                      }}
                    >
                      <RefreshCw
                        className={`size-3.5 ${regenLoading ? "animate-spin" : ""}`}
                        strokeWidth={2.5}
                      />{" "}
                      {regenLoading
                        ? "Generating..."
                        : weekly?.aiSuggestion
                          ? "Regenerate AI"
                          : "Generate AI Suggestion"}
                    </Button>
                    <span className="text-xs font-bold text-foreground/60">
                      Gemini free-tier, cached once, cooldown 1h
                    </span>
                  </div>
                  {error && (
                    <div className="text-sm font-bold text-red-700 bg-red-50 border-2 border-red-600 p-2">
                      {error}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
