"use client";

import * as React from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth/AuthContext";

export type TaskDoc = {
  id: string;
  category: "hustle" | "humble";
  title: string;
  level: number;
  durationHours: number;
  date: string;
  status: "pending" | "completed" | "missed";
  score: number | null;
  createdAt: unknown;
  completedAt?: unknown;
};

export function useTasks(date: string) {
  const { user } = useAuth();
  const [tasks, setTasks] = React.useState<TaskDoc[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }
    if (!date) return;
    setLoading(true);
    const col = collection(db, `users/${user.uid}/tasks`);
    const q = query(col, where("date", "==", date));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs: TaskDoc[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TaskDoc, "id">) }));
        // sort by createdAt or category
        docs.sort((a, b) => {
          if (a.category !== b.category) return a.category === "hustle" ? -1 : 1;
          return 0;
        });
        setTasks(docs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, date]);

  return { tasks, loading, error };
}
