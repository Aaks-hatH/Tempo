"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  CheckSquare,
  FileText,
  Hash,
  Home,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Timer,
  Video,
  X,
  Zap,
} from "lucide-react";
import { useTempoStore } from "@/store/use-tempo-store";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  group: string;
  keywords?: string[];
}

function useCommandItems(router: ReturnType<typeof useRouter>, close: () => void) {
  const navigate = (path: string) => {
    router.push(path);
    close();
  };

  const items: CommandItem[] = [
    // Navigation
    { id: "nav-dashboard", label: "Dashboard", description: "Team mission control", icon: Home, action: () => navigate("/dashboard"), group: "Navigate", keywords: ["home"] },
    { id: "nav-tasks", label: "Tasks & Kanban", description: "Manage work items", icon: CheckSquare, action: () => navigate("/tasks"), group: "Navigate" },
    { id: "nav-calendar", label: "Calendar", description: "Schedule and events", icon: Calendar, action: () => navigate("/calendar"), group: "Navigate" },
    { id: "nav-projects", label: "Projects", description: "Team workspaces", icon: Hash, action: () => navigate("/projects"), group: "Navigate" },
    { id: "nav-chat", label: "Team Chat", description: "Channels and messages", icon: MessageSquare, action: () => navigate("/chat"), group: "Navigate" },
    { id: "nav-notes", label: "Notes", description: "Docs and ideas", icon: FileText, action: () => navigate("/notes"), group: "Navigate" },
    { id: "nav-focus", label: "Focus Mode", description: "Pomodoro timer", icon: Timer, action: () => navigate("/focus"), group: "Navigate" },
    { id: "nav-call", label: "Video Calls", description: "Team video rooms", icon: Video, action: () => navigate("/call"), group: "Navigate" },
    { id: "nav-settings", label: "Settings", description: "Account & preferences", icon: Settings, action: () => navigate("/settings"), group: "Navigate" },
    // Quick actions
    { id: "create-task", label: "New Task", description: "Create a task", icon: Plus, action: () => { navigate("/tasks"); }, group: "Create", keywords: ["add", "todo"] },
    { id: "create-note", label: "New Note", description: "Write a note", icon: Plus, action: () => navigate("/notes"), group: "Create" },
    { id: "create-event", label: "New Event", description: "Schedule an event", icon: Plus, action: () => navigate("/calendar"), group: "Create" },
    { id: "start-focus", label: "Start Focus Session", description: "Begin a Pomodoro timer", icon: Zap, action: () => navigate("/focus"), group: "Quick Actions", keywords: ["pomodoro", "timer", "work"] },
    { id: "join-call", label: "Join a Call", description: "Enter a video call room", icon: Video, action: () => navigate("/call"), group: "Quick Actions" },
  ];

  return items;
}

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useTempoStore();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const close = useCallback(() => {
    setCommandOpen(false);
    setQuery("");
    setSelected(0);
  }, [setCommandOpen]);

  const items = useCommandItems(router, close);

  const filtered = query.trim()
    ? items.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          item.keywords?.some((k) => k.includes(q)) ||
          item.group.toLowerCase().includes(q)
        );
      })
    : items;

  // Group items
  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  // Flatten for keyboard nav
  const flatItems = Object.values(groups).flat();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(!commandOpen);
      }
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [commandOpen, setCommandOpen, close]);

  useEffect(() => {
    if (commandOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setSelected(0);
    }
  }, [commandOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      flatItems[selected]?.action();
    }
  };

  return (
    <AnimatePresence>
      {commandOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-white/12 bg-[#0a0f1a] shadow-2xl"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
              <Search className="size-4 shrink-0 text-slate-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search or jump to..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-slate-500 hover:text-white">
                  <X className="size-4" />
                </button>
              )}
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-xs text-slate-500">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto py-2">
              {flatItems.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">No results for &ldquo;{query}&rdquo;</div>
              ) : (
                Object.entries(groups).map(([group, groupItems]) => (
                  <div key={group}>
                    <div className="px-4 py-1.5 text-xs font-medium text-slate-600 uppercase tracking-wider">{group}</div>
                    {groupItems.map((item) => {
                      const flatIdx = flatItems.indexOf(item);
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setSelected(flatIdx)}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                            flatIdx === selected ? "bg-white/8" : "hover:bg-white/5",
                          )}
                        >
                          <span className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-lg",
                            flatIdx === selected ? "bg-blue-500/20 text-blue-300" : "bg-white/5 text-slate-400",
                          )}>
                            <Icon className="size-3.5" />
                          </span>
                          <span>
                            <span className="block text-sm text-white">{item.label}</span>
                            {item.description && (
                              <span className="block text-xs text-slate-500">{item.description}</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 border-t border-white/8 px-4 py-2 text-xs text-slate-600">
              <span><kbd className="rounded border border-white/10 bg-white/5 px-1">↑↓</kbd> navigate</span>
              <span><kbd className="rounded border border-white/10 bg-white/5 px-1">↵</kbd> open</span>
              <span><kbd className="rounded border border-white/10 bg-white/5 px-1">esc</kbd> close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
