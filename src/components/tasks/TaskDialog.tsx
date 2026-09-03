"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCreateTaskCallable,
  getUpdateTaskCallable,
} from "@/lib/firebase-functions";
import type { TaskDoc } from "@/lib/hooks/useTasks";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns"; // <-- Tambahkan parseISO
import { Calendar } from "@/components/ui/calendar";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTask?: TaskDoc | null;
  defaultDate: string; // YYYY-MM-DD
  defaultCategory?: "hustle" | "humble";
  onSuccess?: () => void;
};

export function TaskDialog({
  open,
  onOpenChange,
  initialTask,
  defaultDate,
  defaultCategory,
  onSuccess,
}: Props) {
  const isEdit = !!initialTask;
  const [category, setCategory] = React.useState<"hustle" | "humble">(
    initialTask?.category || defaultCategory || "hustle",
  );
  const [title, setTitle] = React.useState(initialTask?.title || "");
  const [level, setLevel] = React.useState<number>(initialTask?.level || 3);
  const [duration, setDuration] = React.useState<string>(
    initialTask ? String(initialTask.durationHours) : "1",
  );
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

  const accent =
    category === "hustle" ? "var(--color-hustle)" : "var(--color-humble)";

  // Helper untuk mengubah string YYYY-MM-DD ke Date object tanpa timezone shift
  const selectedDateObject = React.useMemo(() => {
    return date ? parseISO(date) : undefined;
  }, [date]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95%] md:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Add Task"}</DialogTitle>
          <DialogDescription>
            Fill in the task details. Score = level × duration (hours).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 p-2">
              {error}
            </div>
          )}

          <div className="grid gap-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as "hustle" | "humble")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hustle">Hustle (Productivity)</SelectItem>
                <SelectItem value="humble">Humble (Recovery)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Deep work, Meditation, Exercise, etc."
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>
              Level ({category === "hustle" ? "Pressure" : "Relaxation"}):{" "}
              {level}
              /5
            </Label>
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
                    style={{
                      background: filled ? accent : "var(--neo-white)",
                      color: filled ? "white" : "black",
                    }}
                    aria-label={`Set level ${lvl}`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration (hours) • 24h Daily cap</Label>
              <Input
                id="duration"
                type="number"
                step="0.25"
                min="0.25"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="noShadow"
                    className="w-full justify-start text-left font-base"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDateObject ? (
                      format(selectedDateObject, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto border-0! p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDateObject}
                    onSelect={(selectedDate) => {
                      if (selectedDate) {
                        // Gunakan format(selectedDate, "yyyy-MM-dd") agar sesuai local time
                        setDate(format(selectedDate, "yyyy-MM-dd"));
                      }
                    }}
                    initialFocus
                    required
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              className="bg-hustle"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-humble">
              {loading ? "Saving..." : isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
