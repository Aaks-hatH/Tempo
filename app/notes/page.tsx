"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, Pin, Plus, Search, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { LinkRenderer } from "@/components/link-renderer";
import { cn } from "@/lib/utils";

interface Note {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  color: string;
  updatedAt: string;
}

const COLORS = ["#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444"];

/** Render note content line-by-line so LinkRenderer can detect URLs per line */
function NoteContentRenderer({ content, className }: { content: string; className?: string }) {
  const lines = content.split("\n");
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i}>
          <LinkRenderer text={line} />
          {i < lines.length - 1 && "\n"}
        </span>
      ))}
    </span>
  );
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [search, setSearch] = useState("");
  const [editMode, setEditMode] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchNotes = useCallback(async () => {
    const res = await fetch(`/api/notes${search ? `?search=${encodeURIComponent(search)}` : ""}`);
    if (res.ok) {
      const { notes: n } = await res.json();
      setNotes(n);
    }
    setLoading(false);
  }, [search]);

  useEffect(() => { void fetchNotes(); }, [fetchNotes]);

  const createNote = async () => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled", content: "" }),
    });
    if (res.ok) {
      const { note } = await res.json();
      setNotes((prev) => [note, ...prev]);
      setActiveNote(note);
      setEditMode(true);
    }
  };

  const saveNote = useCallback(async (note: Note) => {
    const res = await fetch(`/api/notes/${note._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: note.title, content: note.content, tags: note.tags, pinned: note.pinned, color: note.color }),
    });
    if (res.ok) {
      const { note: updated } = await res.json();
      setNotes((prev) => prev.map((n) => n._id === updated._id ? updated : n));
    }
  }, []);

  const updateActive = (patch: Partial<Note>) => {
    if (!activeNote) return;
    const updated = { ...activeNote, ...patch };
    setActiveNote(updated);
    setNotes((prev) => prev.map((n) => n._id === updated._id ? updated : n));
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void saveNote(updated), 1200);
  };

  const deleteNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n._id !== id));
    if (activeNote?._id === id) { setActiveNote(null); setEditMode(false); }
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
  };

  const filteredNotes = search
    ? notes
    : [...notes.filter((n) => n.pinned), ...notes.filter((n) => !n.pinned)];

  return (
    <AppShell>
      <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-7xl overflow-hidden rounded-2xl border border-white/8 bg-black/30">
        {/* Sidebar */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-white/8">
          <div className="flex items-center gap-2 p-3 border-b border-white/8">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-1.5">
              <Search className="size-3.5 text-slate-500 shrink-0" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes..."
                className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-600 outline-none" />
              {search && <button onClick={() => setSearch("")} className="text-slate-500 hover:text-white"><X className="size-3" /></button>}
            </div>
            <button onClick={() => void createNote()}
              className="rounded-xl bg-blue-500 p-1.5 hover:bg-blue-400 shadow-[0_0_12px_rgba(59,130,246,.4)]">
              <Plus className="size-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="size-4 animate-spin text-slate-500" /></div>
            ) : filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center py-10 gap-2 text-slate-600">
                <FileText className="size-8" />
                <p className="text-xs">{search ? "No results" : "No notes yet"}</p>
                {!search && (
                  <button onClick={() => void createNote()}
                    className="text-xs text-blue-400 hover:text-blue-300">Create one →</button>
                )}
              </div>
            ) : (
              filteredNotes.map((note) => (
                <button key={note._id} onClick={() => { setActiveNote(note); setEditMode(false); }}
                  className={cn("group w-full rounded-xl p-3 text-left transition-colors",
                    activeNote?._id === note._id ? "bg-white/10" : "hover:bg-white/5")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {note.pinned && <Pin className="size-3 shrink-0 text-yellow-400" />}
                      <p className="truncate text-sm font-medium">{note.title || "Untitled"}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); void deleteNote(note._id); }}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 shrink-0">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  {/* Preview: plain text, LinkRenderer would be wasted here since it's truncated */}
                  <p className="mt-1 line-clamp-2 text-[11px] text-slate-600 leading-relaxed">
                    {note.content || "Empty note"}
                  </p>
                  <p className="mt-1 text-[10px] text-slate-700">
                    {new Date(note.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Editor / Viewer */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeNote ? (
            <>
              <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => updateActive({ color: c })}
                    className={cn("size-4 rounded-full border transition-all",
                      activeNote.color === c ? "border-white scale-110" : "border-transparent")}
                    style={{ background: c }} />
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => updateActive({ pinned: !activeNote.pinned })}
                    className={cn("flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors",
                      activeNote.pinned ? "text-yellow-400 bg-yellow-400/10" : "text-slate-500 hover:text-white hover:bg-white/5")}>
                    <Pin className="size-3" />
                    {activeNote.pinned ? "Pinned" : "Pin"}
                  </button>
                  {/* Toggle edit / preview */}
                  <button
                    onClick={() => setEditMode((v) => !v)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/8 px-2.5 py-1 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {editMode ? "Preview" : "Edit"}
                  </button>
                  <span className="text-[11px] text-slate-600">
                    Auto-saves
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {editMode ? (
                  /* ── Edit mode: plain textarea ── */
                  <>
                    <input
                      value={activeNote.title}
                      onChange={(e) => updateActive({ title: e.target.value })}
                      placeholder="Note title..."
                      className="w-full bg-transparent text-2xl font-semibold text-white placeholder:text-slate-700 outline-none mb-4"
                    />
                    <textarea
                      value={activeNote.content}
                      onChange={(e) => updateActive({ content: e.target.value })}
                      placeholder="Start writing... URLs are auto-linked in Preview mode."
                      className="w-full flex-1 bg-transparent text-sm text-slate-300 placeholder:text-slate-700 outline-none leading-relaxed resize-none"
                      style={{ minHeight: "calc(100vh - 22rem)" }}
                    />
                  </>
                ) : (
                  /* ── Preview mode: rendered with clickable links ── */
                  <>
                    <h1
                      className="w-full bg-transparent text-2xl font-semibold text-white mb-4 outline-none"
                      onClick={() => setEditMode(true)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && setEditMode(true)}
                    >
                      {activeNote.title || <span className="text-slate-700">Untitled</span>}
                    </h1>
                    {activeNote.content ? (
                      <NoteContentRenderer
                        content={activeNote.content}
                        className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed"
                      />
                    ) : (
                      <p
                        className="text-slate-700 text-sm cursor-text"
                        onClick={() => setEditMode(true)}
                      >
                        Start writing... click Edit or tap here.
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-600">
              <FileText className="size-12" />
              <p className="text-sm">Select a note or create a new one</p>
              <button onClick={() => void createNote()}
                className="flex items-center gap-2 rounded-xl bg-blue-500/20 border border-blue-500/30 px-4 py-2 text-sm text-blue-300 hover:bg-blue-500/30">
                <Plus className="size-4" /> New note
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
