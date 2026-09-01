"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskDoc } from "@/lib/hooks/useTasks";

type Props = {
  task: TaskDoc;
  onComplete: (id: string) => void;
  onEdit: (task: TaskDoc) => void;
  onDelete: (id: string) => void;
  completingId?: string | null;
};

export function TaskCard({ task, onComplete, onEdit, onDelete, completingId }: Props) {
  const isCompleted = task.status === "completed";
  const isMissed = task.status === "missed";
  const isPending = task.status === "pending";
  const accent = task.category === "hustle" ? "var(--color-hustle)" : "var(--color-humble)";

  return (
    <Card
      className={cn(
        "border-2 py-3 gap-2",
        isCompleted && "opacity-70 bg-muted/20",
        isMissed && "opacity-60"
      )}
      style={{ borderColor: accent }}
    >
      <CardContent className="px-4 py-2 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox
              checked={isCompleted}
              disabled={!isPending || completingId === task.id}
              onCheckedChange={() => isPending && onComplete(task.id)}
              className="mt-1"
              aria-label="Complete task"
            />
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-bold leading-tight break-words", isCompleted && "line-through")}>{task.title}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge
                  variant="neutral"
                  className="text-[10px] px-1.5 py-0 border-2 font-black uppercase"
                  style={{ background: accent, color: "white", borderColor: "black" }}
                >
                  {task.category}
                </Badge>
                <span className="text-xs font-base">{task.durationHours}h</span>
                {task.score !== null && <span className="text-xs font-bold">Score {task.score}</span>}
                {isMissed && <Badge variant="neutral" className="text-[10px] bg-[var(--neo-gray-100)]">Missed</Badge>}
              </div>
              <div className="flex items-center gap-1 mt-1.5" aria-label={`Level ${task.level} of 5`}>
                <span className="text-[10px] font-bold mr-1">{task.category === "hustle" ? "Tekanan" : "Relaksasi"}</span>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-2.5 w-2.5 border border-border"
                    style={{ background: i < task.level ? accent : "var(--neo-white)" }}
                  />
                ))}
                <span className="text-xs ml-1">{task.level}/5</span>
              </div>
            </div>
          </div>
          {isPending && (
            <div className="flex gap-1 shrink-0">
              <Button variant="neutral" size="sm" className="h-7 px-2 text-xs" onClick={() => onEdit(task)}>
                Edit
              </Button>
              <Button variant="neutral" size="sm" className="h-7 px-2 text-xs" onClick={() => onDelete(task.id)}>
                Del
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
