"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskDoc } from "@/lib/hooks/useTasks";
import {
  Pencil,
  Trash2,
  Clock3,
  Award,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";

type Props = {
  task: TaskDoc;
  onComplete: (id: string) => void;
  onEdit: (task: TaskDoc) => void;
  onDelete: (id: string) => void;
  completingId?: string | null;
};

export function TaskCard({
  task,
  onComplete,
  onEdit,
  onDelete,
  completingId,
}: Props) {
  const isCompleted = task.status === "completed";
  const isMissed = task.status === "missed";
  const isPending = task.status === "pending";
  const accent =
    task.category === "hustle" ? "var(--color-hustle)" : "var(--color-humble)";
  const accentBg = task.category === "hustle" ? "bg-hustle" : "bg-humble";

  return (
    <Card
      className={cn(
        "border-2 py-0 gap-0 overflow-hidden shadow-shadow bg-secondary-background",
        isCompleted && "opacity-80",
        isMissed && "opacity-60",
      )}
      style={{ borderColor: accent }}
    >
      {/* top stripe */}
      <div
        className="h-1.5 w-full border-b-2 border-border"
        style={{ background: accent }}
      />

      <CardContent className="p-3 space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isCompleted}
            disabled={!isPending || completingId === task.id}
            onCheckedChange={() => isPending && onComplete(task.id)}
            className={cn(
              "mt-0.5 size-4 md:size-5 rounded-none border-2 data-[state=checked]:border-border shadow-sm",
              isCompleted && "data-[state=checked]:bg-black",
            )}
            aria-label="Complete task"
          />

          <div className="flex-1 min-w-0 space-y-2">
            <p
              className={cn(
                "text-sm font-heading font-black leading-tight wrap-break-word",
                isCompleted && "line-through decoration-2",
              )}
            >
              {task.title}
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                className="text-[10px] px-2 py-0.5 border-2 font-black uppercase tracking-widest"
                style={{
                  background: accent,
                  color: task.category === "humble" ? "black" : "white",
                  borderColor: "black",
                }}
              >
                {task.category}
              </Badge>
              <span className="inline-flex items-center gap-1 border-2 border-border bg-white px-1.5 py-0.5 text-xs font-bold">
                <Clock3 className="size-3" strokeWidth={2.5} />{" "}
                {task.durationHours}h
              </span>
              {task.score !== null && (
                <span className="inline-flex items-center gap-1 border-2 border-border bg-accent px-1.5 py-0.5 text-xs font-black">
                  <Award className="size-3" strokeWidth={2.5} /> {task.score}
                </span>
              )}
              {isCompleted && (
                <Badge
                  variant="neutral"
                  className="text-xs bg-black font-black text-white border-black gap-1"
                >
                  <CheckCircle2 className="size-3" strokeWidth={2.5} /> Done
                </Badge>
              )}
              {isMissed && (
                <Badge
                  variant="neutral"
                  className="text-xs font-black bg-(--neo-gray-100) gap-1"
                  title="Don't have time yet, doesn't reduce score"
                >
                  <CircleAlert className="size-3" strokeWidth={2.5} /> Don't
                  have time yet
                </Badge>
              )}
            </div>

            <div
              className="flex items-center gap-1"
              aria-label={`Level ${task.level} of 5`}
            >
              <span className="text-[10px] font-black tracking-widest mr-1">
                {task.category === "hustle" ? "PRESSURE" : "RELAXATION"}
              </span>
              {Array.from({ length: 5 }).map((_, i) => (
                <span
                  key={i}
                  className="h-3 w-3 border-2 border-border"
                  style={{
                    background: i < task.level ? accent : "var(--neo-white)",
                  }}
                />
              ))}
              <span className="text-xs font-black ml-1">{task.level}/5</span>
            </div>
          </div>
        </div>

        {isPending && (
          <div className="flex gap-2 pt-1">
            <Button
              variant="neutral"
              size="sm"
              className="h-8 flex-1 bg-white font-bold text-xs gap-1.5"
              onClick={() => onEdit(task)}
            >
              <Pencil className="size-3.5" strokeWidth={2.5} /> Edit
            </Button>
            <Button
              variant="neutral"
              size="sm"
              className="h-8 flex-1 bg-white font-bold text-xs gap-1.5 hover:bg-black hover:text-white"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="size-3.5" strokeWidth={2.5} /> Delete
            </Button>
            <Button
              size="sm"
              className={cn(
                "h-8 flex-1 font-black text-xs gap-1.5 border-2 shadow-shadow",
                accentBg,
                task.category === "humble" ? "text-black" : "text-white",
              )}
              style={{ borderColor: "black" }}
              onClick={() => onComplete(task.id)}
              disabled={completingId === task.id}
            >
              {completingId === task.id ? (
                "..."
              ) : (
                <>
                  <CheckCircle2
                    className="text-xs font-black"
                    strokeWidth={2.5}
                  />{" "}
                  Completed
                </>
              )}
            </Button>
          </div>
        )}

        {isCompleted && Boolean(task.completedAt) && (
          <p className="text-xs font-bold text-foreground/60 border-t-2 border-dashed border-border pt-2">
            ✓ Completed • +{task.score} pts
          </p>
        )}
      </CardContent>
    </Card>
  );
}
