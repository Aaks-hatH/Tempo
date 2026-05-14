"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  Clock,
  FolderKanban,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PingModal } from "@/components/ping-modal";
import { cn } from "@/lib/utils";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type Status = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

interface Task {
  _id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  dueAt?: string;
  tags: string[];
  projectId?: { _id: string; name: string; color: string } | string;
  userId: { _id: string; name?: string; email: string };
  assignedTo?: { _id: string; name?: string; email: string };
}

interface Project {
  _id: string;
  name: string;
  color: string;
}

const COLUMNS: { id: Status; label: string; color: string }[] = [
  { id: "TODO", label: "Backlog", color: "border-slate-500/40" },
  { id: "IN_PROGRESS", label: "In Progress", color: "border-blue-500/40" },
  { id: "REVIEW", label: "Review", color: "border-yellow-500/40" },
  { id: "DONE", label: "Done", color: "border-green-500/40" },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "text-slate-400 bg-slate-400/10",
  MEDIUM: "text-blue-400 bg-blue-400/10",
  HIGH: "text-orange-400 bg-orange-400/10",
  URGENT: "text-red-400 bg-red-400/10",
};

function CreateTaskModal({
  defaultStatus,
  defaultProjectId,
  onClose,
  onCreated,
}: {
  defaultStatus: Status;
  defaultProjectId?: string;
  onClose: () => void;
  onCreated: (task: Task) => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [projects, setProjects] = useState<Project[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {/* noop */});
  }, []);

  const submit = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          priority,
          status: defaultStatus,
          dueAt: dueAt || undefined,
          projectId: projectId || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const { task } = await res.json();
      onCreated(task);
      onClose();
    } catch {
      setError("Failed to create task");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">New Task</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertCircle className="size-4 shrink-0" /> {error}
          </div>
        )}
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          placeholder="Task title..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-400/50"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-slate-500">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-slate-500">Due date</label>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value ? new Date(e.target.value).toISOString() : "")}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-slate-500">Project (optional)</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={submitting}
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium hover:bg-blue-400 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create task"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onDelete,
  onStatusChange,
  isDragging,
  dragHandleProps,
  onPing,
  onAssign,
}: {
  task: Task;
  onDelete: () => void;
  onStatusChange: (status: Status) => void;
  isDragging?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onPing?: () => void;
  onAssign?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={cn(
        "glass rounded-xl p-3 group cursor-grab active:cursor-grabbing transition-opacity",
        isDragging && "opacity-50",
      )}
      {...dragHandleProps}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <div className="relative shrink-0 flex items-center gap-1">
          <button onClick={onPing} title="Ping a teammate about this"
            className="text-slate-700 hover:text-yellow-400 opacity-0 group-hover:opacity-100 transition-all">
            <Zap className="size-3.5" />
          </button>
          <button onClick={onAssign} title="Assign to teammate"
            className="text-slate-700 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all">
            <UserPlus className="size-3.5" />
          </button>
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="text-slate-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ChevronDown className="size-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-5 z-10 w-36 rounded-xl border border-white/10 bg-[#0f1624] py-1 shadow-xl">
              {COLUMNS.filter((c) => c.id !== task.status).map((col) => (
                <button
                  key={col.id}
                  onClick={() => { onStatusChange(col.id); setShowMenu(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-white/8"
                >
                  Move to {col.label}
                </button>
              ))}
              <div className="my-1 border-t border-white/8" />
              <button
                onClick={() => { onDelete(); setShowMenu(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="size-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium", PRIORITY_COLORS[task.priority])}>
          {task.priority}
        </span>
        {task.dueAt && (
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <Clock className="size-3" />
            {new Date(task.dueAt).toLocaleDateString()}
          </span>
        )}
        {task.projectId && typeof task.projectId === "object" && (
          <span
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
            style={{ background: `${task.projectId.color}18`, color: task.projectId.color }}
          >
            <FolderKanban className="size-2.5" />
            {task.projectId.name}
          </span>
        )}
        {task.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        {task.userId?.name && (
          <p className="text-[10px] text-slate-600">{task.userId.name}</p>
        )}
        {task.assignedTo && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[9px] text-slate-700">→</span>
            <div className="grid size-4 place-items-center rounded bg-blue-500/20 text-[8px] font-semibold text-blue-300">
              {(task.assignedTo.name ?? task.assignedTo.email).slice(0, 2).toUpperCase()}
            </div>
            <span className="text-[10px] text-blue-400/70">{task.assignedTo.name ?? task.assignedTo.email.split("@")[0]}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [createFor, setCreateFor] = useState<Status | null>(null);
  const [dragTask, setDragTask] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Status | null>(null);
  const [pingTask, setPingTask] = useState<Task | null>(null);
  const [pingType, setPingType] = useState<"ping" | "assign">("ping");

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/tasks?all=true");
    if (res.ok) {
      const { tasks: t } = await res.json();
      setTasks(t);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTasks();
    const interval = setInterval(fetchTasks, 10_000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const handleStatusChange = async (taskId: string, status: Status) => {
    setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status } : t)));
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  };

  const handleDelete = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
  };

  const handleTaskCreated = (task: Task) => {
    setTasks((prev) => [task, ...prev]);
  };

  // Drag & drop
  const handleDragStart = (taskId: string) => setDragTask(taskId);
  const handleDragEnd = () => {
    if (dragTask && dragOver) {
      const task = tasks.find((t) => t._id === dragTask);
      if (task && task.status !== dragOver) {
        void handleStatusChange(dragTask, dragOver);
      }
    }
    setDragTask(null);
    setDragOver(null);
  };

  const byStatus = (status: Status) => tasks.filter((t) => t.status === status);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
            <p className="mt-0.5 text-sm text-slate-500">{tasks.length} total tasks</p>
          </div>
          <button
            onClick={() => setCreateFor("TODO")}
            className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium hover:bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,.35)]"
          >
            <Plus className="size-4" />
            New task
          </button>
        </header>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => {
              const colTasks = byStatus(col.id);
              const isOver = dragOver === col.id;
              return (
                <div
                  key={col.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-2xl border p-3 min-h-[24rem] transition-colors",
                    col.color,
                    isOver ? "bg-white/5" : "bg-white/[0.02]",
                  )}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(col.id); }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={handleDragEnd}
                >
                  <div className="mb-1 flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-300">{col.label}</span>
                      <span className="rounded-full bg-white/8 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {colTasks.length}
                      </span>
                    </div>
                    <button
                      onClick={() => setCreateFor(col.id)}
                      className="rounded-lg p-1 text-slate-600 hover:bg-white/8 hover:text-white"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>

                  {colTasks.length === 0 ? (
                    <div
                      className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/8 text-sm text-slate-700 cursor-pointer hover:border-white/15 hover:text-slate-600"
                      onClick={() => setCreateFor(col.id)}
                    >
                      Drop here or click +
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <div
                        key={task._id}
                        draggable
                        onDragStart={() => handleDragStart(task._id)}
                        onDragEnd={handleDragEnd}
                      >
                        <TaskCard
                          task={task}
                          isDragging={dragTask === task._id}
                          onDelete={() => void handleDelete(task._id)}
                          onStatusChange={(s) => void handleStatusChange(task._id, s)}
                          onPing={() => { setPingTask(task); setPingType("ping"); }}
                          onAssign={() => { setPingTask(task); setPingType("assign"); }}
                        />
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {createFor && (
        <CreateTaskModal
          defaultStatus={createFor}
          onClose={() => setCreateFor(null)}
          onCreated={handleTaskCreated}
        />
      )}

      {pingTask && (
        <PingModal
          open={!!pingTask}
          onClose={() => setPingTask(null)}
          defaultType={pingType}
          taskId={pingTask._id}
          taskTitle={pingTask.title}
        />
      )}
    </AppShell>
  );
}
