"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTasks } from "@/lib/hooks/useTasks";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { getDeleteTaskCallable, getCompleteTaskCallable } from "@/lib/firebase-functions";
import type { TaskDoc } from "@/lib/hooks/useTasks";

function todayStr() {
  // local date YYYY-MM-DD
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

export default function HomePage() {
  const [selectedDate, setSelectedDate] = React.useState(todayStr());
  const { tasks, loading, error } = useTasks(selectedDate);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<TaskDoc | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [completingId, setCompletingId] = React.useState<string | null>(null);

  const hustle = tasks.filter((t) => t.category === "hustle");
  const humble = tasks.filter((t) => t.category === "humble");
  const totalHustleScore = tasks.filter((t) => t.status === "completed" && t.category === "hustle").reduce((s, t) => s + (t.score || 0), 0);
  const totalHumbleScore = tasks.filter((t) => t.status === "completed" && t.category === "humble").reduce((s, t) => s + (t.score || 0), 0);
  const totalDuration = tasks.reduce((s, t) => s + t.durationHours, 0);

  const handleEdit = (t: TaskDoc) => {
    setEditingTask(t);
    setDialogOpen(true);
  };
  const [presetCategory, setPresetCategory] = React.useState<"hustle" | "humble" | undefined>(undefined);
  const handleAdd = (cat?: "hustle" | "humble") => {
    setEditingTask(null);
    setPresetCategory(cat);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this task?")) return;
    setActionError(null);
    try {
      const del = getDeleteTaskCallable();
      await del({ taskId: id });
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message || "Delete failed";
      setActionError(msg);
    }
  };

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    setActionError(null);
    try {
      const complete = getCompleteTaskCallable();
      await complete({ taskId: id });
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message || "Complete failed";
      setActionError(msg);
    } finally {
      setCompletingId(null);
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-heading font-black">Home — Tasks</h1>
        <div className="flex items-center gap-2">
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-auto" />
          <Button onClick={() => handleAdd()}>+ Add Task</Button>
        </div>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 p-2">{error}</div>}
      {actionError && <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 p-2">{actionError}</div>}

      <div className="flex gap-4 text-sm font-bold">
        <span className="px-2 py-1 bg-[var(--color-hustle)] text-white border-2 border-border">Hustle Score: {totalHustleScore.toFixed(1)}</span>
        <span className="px-2 py-1 bg-[var(--color-humble)] text-white border-2 border-border">Humble Score: {totalHumbleScore.toFixed(1)}</span>
        <span className="px-2 py-1 bg-[var(--neo-gray-100)] border-2 border-border">Duration: {totalDuration.toFixed(1)}h / 24h</span>
      </div>

      {loading ? (
        <p className="text-sm">Loading tasks...</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-[var(--color-hustle)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[var(--color-hustle)]">HUSTLE</CardTitle>
              <Button size="sm" variant="neutral" onClick={() => handleAdd("hustle")}>
                + Hustle
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {hustle.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-border bg-[var(--neo-gray-100)]">
                  <p className="text-sm font-bold">Belum ada Hustle hari ini</p>
                  <p className="text-xs text-muted-foreground mt-1">Yuk tambah satu task produktif untuk mulai — tidak harus berat, 1 jam level 2 juga berarti.</p>
                  <Button size="sm" className="mt-3" onClick={() => handleAdd("hustle")}>Tambah Hustle</Button>
                </div>
              ) : (
                hustle.map((t) => (
                  <TaskCard key={t.id} task={t} onComplete={handleComplete} onEdit={handleEdit} onDelete={handleDelete} completingId={completingId} />
                ))
              )}
            </CardContent>
          </Card>
          <Card className="border-[var(--color-humble)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-[var(--color-humble)]">HUMBLE</CardTitle>
              <Button size="sm" variant="neutral" onClick={() => handleAdd("humble")}>
                + Humble
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {humble.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-border bg-[var(--neo-gray-100)]">
                  <p className="text-sm font-bold">Belum ada Humble hari ini</p>
                  <p className="text-xs text-muted-foreground mt-1">Tambahkan waktu istirahat — tidur, jalan santai, atau journaling agar tetap seimbang.</p>
                  <Button size="sm" variant="neutral" className="mt-3" onClick={() => handleAdd("humble")}>Tambah Humble</Button>
                </div>
              ) : (
                humble.map((t) => (
                  <TaskCard key={t.id} task={t} onComplete={handleComplete} onEdit={handleEdit} onDelete={handleDelete} completingId={completingId} />
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
  );
}
