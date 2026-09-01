"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCreateTaskCallable, getUpdateTaskCallable } from "@/lib/firebase-functions";
import type { TaskDoc } from "@/lib/hooks/useTasks";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTask?: TaskDoc | null;
  defaultDate: string; // YYYY-MM-DD
  defaultCategory?: "hustle" | "humble";
  onSuccess?: () => void;
};

export function TaskDialog({ open, onOpenChange, initialTask, defaultDate, defaultCategory, onSuccess }: Props) {
  const isEdit = !!initialTask;
  const [category, setCategory] = React.useState<"hustle" | "humble">(initialTask?.category || defaultCategory || "hustle");
  const [title, setTitle] = React.useState(initialTask?.title || "");
  const [level, setLevel] = React.useState<number>(initialTask?.level || 3);
  const [duration, setDuration] = React.useState<string>(initialTask ? String(initialTask.durationHours) : "1");
  const [date, setDate] = React.useState(initialTask?.date || defaultDate);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setCategory(initialTask?.category || defaultCategory || "hustle");
      setTitle(initialTask?.title || "");
      setLevel(initialTask?.level || 3);
      setDuration(initialTask ? String(initialTask.durationHours) : "1");
      setDate(initialTask?.date || defaultDate);
      setError(null);
    }
  }, [open, initialTask, defaultDate, defaultCategory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const durationNum = parseFloat(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      setError("Duration must be > 0");
      return;
    }
    if (!title.trim()) {
      setError("Title required");
      return;
    }
    setLoading(true);
    try {
      if (isEdit && initialTask) {
        const update = getUpdateTaskCallable();
        await update({
          taskId: initialTask.id,
          updates: {
            category,
            title: title.trim(),
            level,
            durationHours: durationNum,
            date,
          },
        });
      } else {
        const create = getCreateTaskCallable();
        await create({
          category,
          title: title.trim(),
          level,
          durationHours: durationNum,
          date,
        });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      const anyErr = err as { message?: string; code?: string };
      setError(anyErr.message || "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  const accent = category === "hustle" ? "var(--color-hustle)" : "var(--color-humble)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Add Task"}</DialogTitle>
          <DialogDescription>Isi detail task. Skor = level × durasi (jam).</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 p-2">{error}</div>}

          <div className="grid gap-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as "hustle" | "humble")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hustle">Hustle (Produktivitas)</SelectItem>
                <SelectItem value="humble">Humble (Recovery)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Kerja deep work 2 jam" required />
          </div>

          <div className="grid gap-2">
            <Label>Level ({category === "hustle" ? "Tekanan" : "Relaksasi"}): {level}/5</Label>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => {
                const lvl = i + 1;
                const filled = lvl <= level;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLevel(lvl)}
                    className="h-7 w-7 border-2 border-border flex items-center justify-center text-xs font-black"
                    style={{ background: filled ? accent : "var(--neo-white)", color: filled ? "white" : "black" }}
                    aria-label={`Set level ${lvl}`}
                  >
                    {lvl}
                  </button>
                );
              })}
              <span className="text-xs text-muted-foreground ml-2">Score preview: {(level * (parseFloat(duration) || 0)).toFixed(1)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration (hours)</Label>
              <Input id="duration" type="number" step="0.25" min="0.25" value={duration} onChange={(e) => setDuration(e.target.value)} required />
              <p className="text-[10px] text-muted-foreground">Max {16}h per task, 24h daily cap</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="neutral" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
