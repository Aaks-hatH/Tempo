"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FolderKanban, Hash, Loader2, Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

interface Project {
  _id: string;
  name: string;
  description?: string;
  color: string;
  taskCount: number;
  completedCount: number;
  progress: number;
  createdAt: string;
}

const COLORS = ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444","#EC4899","#06B6D4","#F97316"];

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Project) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!name.trim()) { setError("Name required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, color }),
      });
      if (!res.ok) throw new Error("Failed");
      const { project } = await res.json();
      onCreated(project);
      onClose();
    } catch {
      setError("Failed to create project");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">New Project</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="size-4" /></button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          placeholder="Project name..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-400/50" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)..."
          rows={2}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-400/50" />
        <div>
          <label className="mb-1.5 block text-xs text-slate-500">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)}
                className={cn("size-6 rounded-full border-2 transition-all", color === c ? "border-white scale-110" : "border-transparent")}
                style={{ background: c }} />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5">Cancel</button>
          <button onClick={() => void submit()} disabled={submitting}
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium hover:bg-blue-400 disabled:opacity-50">
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddTaskToProjectModal({ project, onClose, onAdded }: { project: Project; onClose: () => void; onAdded: () => void }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!title.trim()) { setError("Title required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, priority, status: "TODO", projectId: project._id }),
      });
      if (!res.ok) throw new Error("Failed");
      onAdded();
      onClose();
    } catch {
      setError("Failed to create task");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Add Task</h3>
            <p className="text-xs text-slate-500 mt-0.5">to <span style={{ color: project.color }}>{project.name}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="size-4" /></button>
        </div>
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <AlertCircle className="size-4 shrink-0" /> {error}
          </div>
        )}
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          placeholder="Task title..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-400/50" />
        <div>
          <label className="mb-1.5 block text-xs text-slate-500">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5">Cancel</button>
          <button onClick={() => void submit()} disabled={submitting}
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium hover:bg-blue-400 disabled:opacity-50">
            {submitting ? "Adding..." : "Add task"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [addTaskProject, setAddTaskProject] = useState<Project | null>(null);

  const fetchProjects = useCallback(async () => {
    const res = await fetch("/api/projects");
    if (res.ok) {
      const { projects: p } = await res.json();
      setProjects(p);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchProjects(); }, [fetchProjects]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    setProjects((prev) => prev.filter((p) => p._id !== id));
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
            <p className="text-sm text-slate-500">{projects.length} active projects</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-sm font-medium hover:bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,.35)]">
            <Plus className="size-4" /> New project
          </button>
        </header>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-slate-500" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 gap-3">
            <Hash className="size-10 text-slate-700" />
            <p className="text-slate-500">No projects yet</p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-xl bg-blue-500/20 border border-blue-500/30 px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/30">
              <Plus className="size-4" /> Create your first project
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project._id}
                className="group glass rounded-2xl p-5 hover:border-white/20 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-xl"
                      style={{ background: `${project.color}20`, border: `1px solid ${project.color}40` }}>
                      <Hash className="size-4" style={{ color: project.color }} />
                    </span>
                    <div>
                      <h2 className="font-semibold">{project.name}</h2>
                      {project.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{project.description}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => void handleDelete(project._id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity">
                    <Trash2 className="size-4" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${project.progress}%`, background: project.color }} />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="size-3" />
                    {project.completedCount}/{project.taskCount} tasks
                  </div>
                  <span>{project.progress}% complete</span>
                </div>

                {/* Add task button */}
                <button
                  onClick={() => setAddTaskProject(project)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed py-1.5 text-xs transition-colors hover:opacity-80"
                  style={{ borderColor: `${project.color}40`, color: project.color }}
                >
                  <Plus className="size-3" /> Add task
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(p) => setProjects((prev) => [p, ...prev])}
        />
      )}

      {addTaskProject && (
        <AddTaskToProjectModal
          project={addTaskProject}
          onClose={() => setAddTaskProject(null)}
          onAdded={() => void fetchProjects()}
        />
      )}
    </AppShell>
  );
}
