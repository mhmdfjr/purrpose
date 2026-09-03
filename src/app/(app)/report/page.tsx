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
  CardFooter,
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
  Label as RechartsLabel,
  Rectangle,
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
  Medal,
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

  // Chart data: daily tasks bar (per task) - 1 bar per task, distinct fill, tooltip shows hustle/humble
  const BAR_PALETTE = [
    "#FF0052",
    "#00C68D",
    "#FFD400",
    "#0055DA",
    "#FF8A65",
    "#4DB6AC",
    "#FFB74D",
    "#7A83FF",
  ] as const;
  const dailyBarData = tasks.slice(0, 8).map((t, i) => ({
    task: t.title.slice(0, 12) + (t.title.length > 12 ? "…" : ""),
    fullTitle: t.title,
    score: t.score ?? t.level * t.durationHours,
    category: t.category as "hustle" | "humble",
    fill: BAR_PALETTE[i % BAR_PALETTE.length],
  }));
  const dailyBarConfig = {
    score: { label: "Skor" },
  } satisfies Record<string, { label: string; color?: string }>;
  // keep legacy palette for optional per-bar distinct colors
  void BAR_PALETTE;

  const levelData = [1, 2, 3, 4, 5].map((lvl) => ({
    level: `Lv ${lvl}`,
    hustle: tasks.filter((t) => t.level === lvl && t.category === "hustle")
      .length,
    humble: tasks.filter((t) => t.level === lvl && t.category === "humble")
      .length,
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
        <Inbox className="mx-auto size-6 text-foreground" strokeWidth={2} />
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
    <main className="flex-1 mx-auto w-full bg-white">
      <div className="space-y-6 mx-auto w-full max-w-6xl p-4 md:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-heading font-black flex items-center gap-2">
              <BarChart3 className="size-7" strokeWidth={2.5} /> Report
            </h1>
            <p className="text-sm text-foreground/60 font-bold">
              Informative daily & weekly summary of ur tasks.
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
                    <Button className="font-bold bg-accent gap-2">
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
                  className="font-bold bg-accent"
                  onClick={() => setSelectedDate(todayStr())}
                >
                  Today
                </Button>
              </div>
            </div>

            <p className="text-xs text-foreground border-l-4 border-accent pl-3">
              AI & rule based suggestions from this system can be used as a
              reference, not a strict rule. Medical or psychological matters
              should be discussed with a professional.
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
                  <Card className="border-2 shadow-shadow gap-0 bg-hustle">
                    <CardHeader className="py-0">
                      <CardTitle className="text-xs text-white font-black tracking-widest flex items-center gap-1">
                        <Briefcase className="size-3" strokeWidth={2.5} />{" "}
                        HUSTLE SCORE
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-3xl font-black text-white">
                        {hustleScore.toFixed(1)}
                      </p>
                      <p className="text-xs font-bold text-white">
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
                        className=" h-2 [&>div]:bg-black bg-hustle"
                      />
                    </CardContent>
                  </Card>
                  <Card className="border-2 shadow-shadow gap-0 bg-humble">
                    <CardHeader className="py-0">
                      <CardTitle className="text-xs font-black tracking-widest flex items-center gap-1 text-black">
                        <BedDouble className="size-3" strokeWidth={2.5} />{" "}
                        HUMBLE SCORE
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-3xl font-black text-black">
                        {humbleScore.toFixed(1)}
                      </p>
                      <p className="text-xs font-bold text-black">
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
                        className="h-2 [&>div]:bg-black bg-humble"
                      />
                    </CardContent>
                  </Card>
                  <Card className="border-2 shadow-shadow gap-0 bg-info">
                    <CardHeader className="py-0">
                      <CardTitle className="text-xs font-black tracking-widest flex items-center gap-1">
                        <CheckCircle2 className="size-3" strokeWidth={2.5} />{" "}
                        STATUS
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-sm font-black">
                        Pending: {pendingCount} • Completed: {completedCount} •
                        Missed: {missedCount}
                      </p>
                      <Progress
                        value={completionRate * 100}
                        className="h-2 [&>div]:bg-black bg-info"
                      />
                      <p className="text-xs font-bold">
                        Completion {(completionRate * 100).toFixed(0)}% • Missed
                        auto cutover midnight
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts row */}
                <div className="grid gap-4 lg:grid-cols-3">
                  <Card className="border-2 shadow-shadow bg-background gap-0 lg:col-span-2">
                    <CardHeader className="">
                      <CardTitle className="text-sm font-black flex items-center gap-2">
                        <BarChart3 className="size-4" strokeWidth={2.5} /> Score
                        per Task (Top 8)
                      </CardTitle>
                      <CardDescription className="font-bold text-xs">
                        List of top scored tasks, color-coded. Hover for
                        details.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="w-full">
                      {dailyBarData.length === 0 ? (
                        <div className="text-center py-2 border-2 border-dashed border-border bg-(--neo-gray-100) font-bold text-sm">
                          U don't have data for chart yet. Add Hustle/Humble
                          tasks and mark them completed to see the chart.
                        </div>
                      ) : (
                        <ChartContainer
                          config={dailyBarConfig}
                          className="md:max-h-65 w-full p-0 m-0 "
                        >
                          <BarChart accessibilityLayer data={dailyBarData}>
                            <CartesianGrid
                              vertical={false}
                              stroke="var(--border)"
                            />
                            <XAxis
                              dataKey="task"
                              tickLine={false}
                              tickMargin={10}
                              // axisLine={false}
                              // tick={{ fontSize: 11, fontWeight: 700 }}
                              interval={0}
                              textAnchor="end"
                              height={30}
                            />
                            <ChartTooltip
                              cursor={false}
                              content={
                                <ChartTooltipContent
                                  hideLabel
                                  className="bg-white"
                                  formatter={(value, _name, item) => {
                                    const p = (
                                      item as unknown as {
                                        payload?: {
                                          category?: string;
                                          fullTitle?: string;
                                        };
                                      }
                                    )?.payload;
                                    const cat =
                                      p?.category === "hustle"
                                        ? "Hustle"
                                        : p?.category === "humble"
                                          ? "Humble"
                                          : "";
                                    const title = p?.fullTitle || "";
                                    return (
                                      <div className="flex flex-col gap-1 bg-white">
                                        <span className="font-black">
                                          {title}
                                        </span>
                                        <span className="font-bold">
                                          {cat} • Score {value}
                                        </span>
                                      </div>
                                    ) as unknown as string;
                                  }}
                                />
                              }
                            />
                            <Bar
                              dataKey="score"
                              strokeWidth={2}
                              radius={0}
                              activeIndex={2}
                              activeBar={({ ...props }) => {
                                const fill =
                                  (
                                    props as unknown as {
                                      payload?: { fill?: string };
                                    }
                                  )?.payload?.fill ||
                                  (props as unknown as { fill?: string }).fill;
                                return (
                                  <Rectangle
                                    {...(props as unknown as Record<
                                      string,
                                      unknown
                                    >)}
                                    fillOpacity={1.0}
                                    stroke={fill as string}
                                    fill={fill as string}
                                    className="border-2 border-border"
                                  />
                                );
                              }}
                            >
                              {dailyBarData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.fill}
                                  stroke="var(--border)"
                                  strokeWidth={2}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                      )}
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-2 text-sm py-0">
                      <div className="flex gap-2 leading-none font-black">
                        Top 8 task for today{" "}
                        <TrendingUp className="size-4" strokeWidth={2.5} />
                      </div>
                      <div className="text-muted-foreground leading-none font-bold text-xs">
                        Score = level × duration • different colors per bar •
                        check tooltip for hustle/humble
                      </div>
                    </CardFooter>
                  </Card>

                  <Card className="flex flex-col border-2 shadow-shadow gap-0 bg-background">
                    <CardHeader className="items-center py-0 ">
                      <CardTitle className="text-sm font-black flex items-center gap-2">
                        <PieIcon className="size-4" strokeWidth={2.5} /> Score
                        Distribution
                      </CardTitle>
                      <CardDescription className="font-bold text-xs">
                        Hustle rose • Humble green • Pending gray
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="">
                      {pieData.length === 0 ? (
                        <div className="text-center py-4 border-2 border-dashed border-border bg-(--neo-gray-100) font-bold text-sm">
                          No scores available. Complete Hustle/Humble tasks to
                          see the distribution chart.
                        </div>
                      ) : (
                        <ChartContainer
                          config={pieConfig}
                          className="max-h-65 w-full aspect-square  p-0 m-0"
                        >
                          <PieChart>
                            <ChartTooltip
                              cursor={false}
                              content={
                                <ChartTooltipContent
                                  hideLabel
                                  className="bg-white"
                                />
                              }
                            />
                            <Pie
                              data={pieData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={60}
                              strokeWidth={2}
                              stroke="var(--border)"
                            >
                              {pieData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.fill} />
                              ))}
                              <RechartsLabel
                                content={({ viewBox }) => {
                                  if (
                                    viewBox &&
                                    "cx" in viewBox &&
                                    "cy" in viewBox
                                  ) {
                                    const total = pieData.reduce(
                                      (acc, curr) => acc + curr.value,
                                      0,
                                    );
                                    return (
                                      <text
                                        x={viewBox.cx}
                                        y={viewBox.cy}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                      >
                                        <tspan
                                          x={viewBox.cx}
                                          y={viewBox.cy}
                                          className="fill-foreground text-3xl font-black"
                                        >
                                          {total.toFixed(1)}
                                        </tspan>
                                        <tspan
                                          x={viewBox.cx}
                                          y={(viewBox.cy || 0) + 20}
                                          className="fill-foreground text-xs font-bold"
                                        >
                                          Total Skor
                                        </tspan>
                                      </text>
                                    );
                                  }
                                }}
                              />
                            </Pie>
                          </PieChart>
                        </ChartContainer>
                      )}
                    </CardContent>
                    <CardFooter className="flex-col gap-2 text-sm py-0 ">
                      <div className="flex items-center gap-2 leading-none font-black">
                        Hustle {hustleScore.toFixed(1)} vs Humble{" "}
                        {humbleScore.toFixed(1)}{" "}
                        <TrendingUp className="size-4" strokeWidth={2.5} />
                      </div>
                      <div className="text-muted-foreground leading-none font-bold text-xs">
                        {completedCount} completed • {pendingCount} pending{" "}
                        {missedCount > 0 ? `• ${missedCount} missed` : ""}
                      </div>
                    </CardFooter>
                  </Card>
                </div>

                <Card className="border-2 shadow-shadow bg-secondary-background gap-0">
                  <CardHeader className="">
                    <CardTitle className="text-sm font-black flex items-center gap-2">
                      <TrendingUp className="size-4" strokeWidth={2.5} />{" "}
                      Distribution Level (1-5)
                    </CardTitle>
                    <CardDescription className="font-bold text-xs">
                      Hustle (Pressure Level) • Humble (Relaxation Level)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="">
                    <ChartContainer
                      config={levelConfig}
                      className="h-55 w-full"
                    >
                      <AreaChart
                        accessibilityLayer
                        data={levelData}
                        margin={{ left: 12, right: 12 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          stroke="var(--border)"
                          strokeDasharray="3 3"
                        />
                        <XAxis
                          dataKey="level"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tick={{ fontSize: 12, fontWeight: 700 }}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent indicator="line" />}
                        />
                        <Area
                          dataKey="humble"
                          type="natural"
                          fill="var(--color-humble)"
                          stroke="var(--color-humble)"
                          stackId="a"
                          strokeWidth={2}
                          fillOpacity={0.9}
                          activeDot={{
                            fill: "var(--chart-active-dot)",
                            stroke: "var(--border)",
                            strokeWidth: 2,
                          }}
                        />
                        <Area
                          dataKey="hustle"
                          type="natural"
                          fill="var(--color-hustle)"
                          stroke="var(--color-hustle)"
                          stackId="a"
                          strokeWidth={2}
                          fillOpacity={0.9}
                          activeDot={{
                            fill: "var(--chart-active-dot)",
                            stroke: "var(--border)",
                            strokeWidth: 2,
                          }}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border-2 pt-0 shadow-shadow bg-secondary-background">
                    <CardHeader className="border-b-2 border-border py-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-white bg-hustle flex items-center gap-2 p-2 border-2 border-black">
                        <Briefcase className="size-4" strokeWidth={2.5} />{" "}
                        HUSTLE
                      </CardTitle>
                      <Badge className="bg-hustle text-white border-black font-black">
                        {hustle.length}
                      </Badge>
                    </CardHeader>
                    <CardContent>{renderList(hustle)}</CardContent>
                  </Card>
                  <Card className="border-2 pt-0 shadow-shadow bg-secondary-background">
                    <CardHeader className="border-b-2 border-border py-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-black bg-humble flex items-center gap-2 p-2 border-2 border-black">
                        <BedDouble className="size-4" strokeWidth={2.5} />{" "}
                        HUMBLE
                      </CardTitle>
                      <Badge className="bg-humble text-black border-black font-black">
                        {humble.length}
                      </Badge>
                    </CardHeader>
                    <CardContent>{renderList(humble)}</CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="weekly" className="space-y-6 mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-xl font-heading font-black">Weekly Report</h2>
              <div className="flex items-center gap-2">
                <Input
                  id="weekId"
                  value={weekIdInput}
                  onChange={(e) => setWeekIdInput(e.target.value)}
                  placeholder="2026-W36"
                  className="w-36 bg-accent border-2 font-bold shadow-shadow"
                />
                <Button
                  variant="neutral"
                  className="bg-accent font-black"
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
              <Card className="border-2 shadow-shadow bg-background">
                <CardHeader className="border-b-2 pb-2 border-border">
                  <CardTitle className="flex items-center gap-2">
                    <Medal className="size-5" strokeWidth={2.5} /> Badges
                    Collection
                    <Badge className="bg-black text-white border-black font-black">
                      {weekIdInput ? weekIdInput : "?"}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs font-bold text-foreground/60">
                    U're not in a group leaderboard yet. Please complete your
                    weekly report to see your rank and badges.
                  </p>
                </CardHeader>
                <CardContent className="text-center py-2">
                  <div className="text-center py-10 border-2 border-dashed border-border">
                    <Inbox
                      className="mx-auto size-8 text-foreground"
                      strokeWidth={2}
                    />
                    <p className="text-sm font-black mt-2">
                      U don't have report for {weekIdInput} yet. Keep going!
                    </p>
                    <p className="text-xs font-bold text-foreground/60 mt-1 max-w-xl mx-auto">
                      Weekly report is formed on Monday 00:00 UTC. If this week
                      is still on going, check it back after moday or coba try
                      previous week. Insight is not an assessment, just a
                      reflection.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-2 shadow-shadow bg-secondary-background">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-black tracking-widest flex items-center gap-1">
                        <BarChart3 className="size-3" strokeWidth={2.5} />{" "}
                        BALANCE INDEX
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
                          style={{
                            left: `calc(${weekly.balanceIndex}% - 3px)`,
                          }}
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
                        <BarChart3 className="size-4" strokeWidth={2.5} />{" "}
                        Hustle vs Humble (this week)
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
                        <PieIcon className="size-4" strokeWidth={2.5} /> Score
                        Composition (this week)
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
                        <TrendingUp className="size-4" strokeWidth={2.5} /> 4
                        Weeks Trend - Balance & Score
                      </CardTitle>
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
                      Weekly Suggestion
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
                        Made by Gemini
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
    </main>
  );
}
