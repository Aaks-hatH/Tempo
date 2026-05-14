"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  _id: string;
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: string;
  dueAt?: string;
  tags?: string[];
}

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-blue-400",
  HIGH: "bg-orange-400",
  URGENT: "bg-red-400",
};

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/tasks?status=TODO&status=IN_PROGRESS")
      .then((r) => r.json())
      .then(({ tasks: t }) => { setTasks(t ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-4"><Loader2 className="size-4 animate-spin text-slate-500" /></div>
  );

  if (tasks.length === 0) return (
    <p className="py-4 text-sm text-slate-600">No tasks yet.</p>
  );

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div key={task._id} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/5">
          <span className={cn("size-2 shrink-0 rounded-full", PRIORITY_DOT[task.priority] ?? "bg-slate-500")} />
          <span className="flex-1 text-sm truncate">{task.title}</span>
          {task.dueAt && (
            <span className="text-xs text-slate-600">
              {new Date(task.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
