"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks } from "@/lib/hooks/useTasks";
import { useAuth } from "@/lib/auth/AuthContext";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import {
  getDeleteTaskCallable,
  getCompleteTaskCallable,
} from "@/lib/firebase-functions";
import type { TaskDoc } from "@/lib/hooks/useTasks";
import { toast } from "sonner";
import {
  CalendarIcon,
  Plus,
  Briefcase,
  BedDouble,
  BarChart3,
  Clock3,
  Trophy,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Inbox,
} from "lucide-react";

function todayStr() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

function parseDateStr(s: string): Date {
  // s is YYYY-MM-DD, parse as local noon to avoid TZ shift
  return parseISO(s + "T12:00:00");
}

export default function HomePage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = React.useState(todayStr());
  const { tasks, loading, error } = useTasks(selectedDate);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskDoc | null>(null);
  const [presetCategory, setPresetCategory] = React.useState<
    "hustle" | "humble" | undefined
  >(undefined);
  const [completingId, setCompletingId] = React.useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const hustle = tasks.filter((t) => t.category === "hustle");
  const humble = tasks.filter((t) => t.category === "humble");
  const totalHustleScore = tasks
    .filter((t) => t.status === "completed" && t.category === "hustle")
    .reduce((s, t) => s + (t.score || 0), 0);
  const totalHumbleScore = tasks
    .filter((t) => t.status === "completed" && t.category === "humble")
    .reduce((s, t) => s + (t.score || 0), 0);
  const totalDuration = tasks.reduce((s, t) => s + t.durationHours, 0);
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const durationPct = Math.min((totalDuration / 24) * 100, 100);
  const isOverCap = totalDuration > 24;
  const isNearCap = totalDuration > 20 && totalDuration <= 24;

  const handleEdit = (t: TaskDoc) => {
    setEditingTask(t);
    setDialogOpen(true);
  };
  const handleAdd = (cat?: "hustle" | "humble") => {
    setEditingTask(null);
    setPresetCategory(cat);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus task ini?")) return;
    try {
      const del = getDeleteTaskCallable();
      await del({ taskId: id });
      toast.success("Task dihapus", { description: "Task berhasil dihapus." });
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message || "Delete failed";
      toast.error("Gagal hapus", { description: msg });
    }
  };

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    try {
      const complete = getCompleteTaskCallable();
      await complete({ taskId: id });
      toast.success("Mantap! +poin", {
        description: "Task ditandai selesai, skor masuk!",
      });
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message || "Complete failed";
      toast.error("Gagal", { description: msg });
    } finally {
      setCompletingId(null);
    }
  };

  const selectedDateObj = React.useMemo(
    () => parseDateStr(selectedDate),
    [selectedDate],
  );
  const displayName =
    user?.displayName || user?.email?.split("@")[0] || "Pejuang";
  const avatarLetter = displayName.slice(0, 1).toUpperCase();

  return (
    <main className="flex-1 mx-auto w-full bg-background">
      <div className="space-y-6 mx-auto w-full max-w-6xl p-4 md:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 border-2 border-border shadow-shadow rounded-none bg-accent">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback className="rounded-none font-heading font-black bg-accent text-black">
                  {avatarLetter}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-black tracking-widest flex items-center gap-1">
                  <Sparkles className="size-3" strokeWidth={2.5} /> TODAY
                </p>
                <h1 className="font-heading text-2xl font-black leading-none">
                  Hello, {displayName}!
                </h1>
                <p className="text-xs text-foreground/60 font-bold">
                  {format(selectedDateObj, "EEEE, d MMMM yyyy", {
                    locale: localeId,
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="neutral"
                    className="gap-2 bg-white font-bold"
                  >
                    <CalendarIcon className="size-4" strokeWidth={2.5} />
                    {format(selectedDateObj, "d MMM yyyy")}
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
                        const iso = d.toISOString().slice(0, 10);
                        // keep local date handling: convert via todayStr logic? use iso directly but adjust for TZ
                        const localIso = new Date(
                          d.getTime() - d.getTimezoneOffset() * 60000,
                        )
                          .toISOString()
                          .slice(0, 10);
                        setSelectedDate(localIso);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                onClick={() => handleAdd()}
                className="bg-accent text-black border-border font-black gap-1.5"
              >
                <Plus className="size-4" strokeWidth={2.5} /> Add Task
              </Button>
            </div>
          </div>

          {/* Stats overview */}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-2 bg-secondary-background shadow-shadow py-4 gap-3">
              <CardContent className="px-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black tracking-widest flex items-center gap-1 text-hustle">
                    <Briefcase className="size-3" strokeWidth={2.5} /> HUSTLE
                  </p>
                  <p className="font-heading text-2xl font-black">
                    {totalHustleScore.toFixed(1)}
                  </p>
                  <p className="text-xs font-bold text-foreground/60">
                    {hustle.length} Tasks •{" "}
                    {hustle.filter((t) => t.status === "completed").length}{" "}
                    Completed
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center border-2 border-border bg-hustle shadow-sm">
                  <Briefcase className="size-5 text-white" strokeWidth={2.5} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 bg-secondary-background shadow-shadow py-4 gap-3">
              <CardContent className="px-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black tracking-widest flex items-center gap-1 text-humble">
                    <BedDouble className="size-3" strokeWidth={2.5} /> HUMBLE
                  </p>
                  <p className="font-heading text-2xl font-black">
                    {totalHumbleScore.toFixed(1)}
                  </p>
                  <p className="text-xs font-bold text-foreground/60">
                    {humble.length} Tasks •{" "}
                    {humble.filter((t) => t.status === "completed").length}{" "}
                    Completed
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center border-2 border-border bg-humble shadow-sm">
                  <BedDouble className="size-5 text-black" strokeWidth={2.5} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 bg-secondary-background shadow-shadow py-4 gap-3">
              <CardContent className="px-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black tracking-widest flex items-center gap-1">
                    <Clock3 className="size-3" strokeWidth={2.5} /> DAILY LOAD
                  </p>
                  <Badge className="font-black bg-accent text-xs border-2">
                    {totalDuration.toFixed(1)} / 24h
                  </Badge>
                </div>
                <Progress
                  value={durationPct}
                  className="mt-3 h-3 border-2 [&>div]:bg-accent"
                />
                <p className="mt-1 text-xs font-bold flex items-center gap-1">
                  {isOverCap ? (
                    <span className="text-red-600 flex items-center gap-1">
                      <AlertTriangle className="size-3" strokeWidth={2.5} />{" "}
                      Over 24h cap!
                    </span>
                  ) : isNearCap ? (
                    <span className="text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="size-3" strokeWidth={2.5} />{" "}
                      Almost 24h cap, slow down!
                    </span>
                  ) : (
                    <span className="text-foreground/60 flex items-center gap-1">
                      <CheckCircle2 className="size-3" strokeWidth={2.5} />{" "}
                      {pendingCount} Pending • Keep it balanced!
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Balance hint */}
          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="border-2 border-border bg-accent px-2 py-1 shadow-sm flex items-center gap-1">
              <BarChart3 className="size-3" strokeWidth={2.5} /> Balance: Hustle{" "}
              {totalHustleScore.toFixed(1)} vs Humble{" "}
              {totalHumbleScore.toFixed(1)}
            </span>
            <span className="border-2 border-border bg-white px-2 py-1 shadow-sm flex items-center gap-1">
              <Trophy className="size-3" strokeWidth={2.5} /> {tasks.length}{" "}
              total tasks today
            </span>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" strokeWidth={2.5} />
            <AlertTitle className="font-black">Failed to load tasks</AlertTitle>
            <AlertDescription className="font-bold">{error}</AlertDescription>
          </Alert>
        )}

        {isOverCap && (
          <Alert className="bg-accent text-black border-border">
            <AlertTriangle className="size-4" strokeWidth={2.5} />
            <AlertTitle className="font-black">
              Daily cap 24hr exceeded!
            </AlertTitle>
            <AlertDescription className="font-bold">
              Reduce ur duration or move to another day, sistem deny to create
              task if total &gt;24h exceeded.
            </AlertDescription>
          </Alert>
        )}

        {/* Main grid */}
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1].map((i) => (
              <Card key={i} className="border-2 shadow-shadow">
                <CardHeader>
                  <Skeleton className="h-6 w-24 border-2 border-border" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-20 w-full border-2 border-border" />
                  <Skeleton className="h-20 w-full border-2 border-border" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border-2 shadow-shadow bg-secondary-background flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 border-b-2 border-border bg-white">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center border-2 border-border bg-hustle">
                    <Briefcase
                      className="size-4 text-white"
                      strokeWidth={2.5}
                    />
                  </div>
                  <CardTitle className="text-hustle text-lg">HUSTLE</CardTitle>
                  <Badge className="bg-hustle text-white border-black font-black">
                    {hustle.length}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  className="bg-hustle text-white border-black font-black shadow-shadow"
                  onClick={() => handleAdd("hustle")}
                >
                  <Plus className="size-3.5" strokeWidth={2.5} /> Hustle
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 flex-1">
                {hustle.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border bg-(--neo-gray-100)">
                    <Inbox
                      className="mx-auto size-8 text-foreground/40"
                      strokeWidth={2}
                    />
                    <p className="mt-2 text-sm font-black">
                      U don't have any Hustle today
                    </p>
                    <p className="mx-auto mt-1 max-w-65 text-xs leading-relaxed text-foreground/60">
                      Let's add some Hustle: work, study, or side project to
                      earn points and stay productive.
                    </p>
                    <Button
                      size="sm"
                      className="mt-4 bg-hustle text-white border-black font-black"
                      onClick={() => handleAdd("hustle")}
                    >
                      <Plus className="size-3.5" strokeWidth={2.5} /> Add Hustle
                    </Button>
                  </div>
                ) : (
                  hustle.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onComplete={handleComplete}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      completingId={completingId}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-2 shadow-shadow bg-secondary-background flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 border-b-2 border-border bg-white">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center border-2 border-border bg-humble">
                    <BedDouble
                      className="size-4 text-black"
                      strokeWidth={2.5}
                    />
                  </div>
                  <CardTitle className="text-humble text-lg">HUMBLE</CardTitle>
                  <Badge className="bg-humble text-black border-black font-black">
                    {humble.length}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  className="bg-humble text-black border-black font-black shadow-shadow"
                  onClick={() => handleAdd("humble")}
                >
                  <Plus className="size-3.5" strokeWidth={2.5} /> Humble
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 flex-1">
                {humble.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-border bg-(--neo-gray-100)">
                    <Inbox
                      className="mx-auto size-8 text-foreground/40"
                      strokeWidth={2}
                    />
                    <p className="mt-2 text-sm font-black">
                      U don't have any Humble today
                    </p>
                    <p className="mx-auto mt-1 max-w-65 text-xs leading-relaxed text-foreground/60">
                      Add some rest time: sleep, take a walk, or do some
                      journaling to stay balanced.
                    </p>
                    <Button
                      size="sm"
                      variant="neutral"
                      className="mt-4 bg-white font-black"
                      onClick={() => handleAdd("humble")}
                    >
                      <Plus className="size-3.5" strokeWidth={2.5} /> Add Humble
                    </Button>
                  </div>
                ) : (
                  humble.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onComplete={handleComplete}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      completingId={completingId}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <TaskDialog
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) {
              setEditingTask(null);
              setPresetCategory(undefined);
            }
          }}
          initialTask={editingTask}
          defaultDate={selectedDate}
          defaultCategory={presetCategory}
        />
      </div>
    </main>
  );
}
