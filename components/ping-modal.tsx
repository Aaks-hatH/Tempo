"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ClipboardList,
  Loader2,
  MessageSquare,
  Search,
  UserPlus,
  X,
  Zap,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  _id: string;
  name?: string;
  email: string;
  isOnline: boolean;
  focusActive: boolean;
}

interface PingModalProps {
  open: boolean;
  onClose: () => void;
  defaultType?: "ping" | "assign" | "mention" | "request";
  taskId?: string;
  taskTitle?: string;
  preselectedUserId?: string;
}

const TYPES = [
  { id: "ping" as const, label: "Ping", icon: Zap, desc: "Send a quick nudge", color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" },
  { id: "assign" as const, label: "Assign Task", icon: ClipboardList, desc: "Assign work to them", color: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
  { id: "mention" as const, label: "Mention", icon: MessageSquare, desc: "Reference in chat", color: "text-purple-400 border-purple-400/30 bg-purple-400/10" },
  { id: "request" as const, label: "Request Help", icon: UserPlus, desc: "Ask for assistance", color: "text-green-400 border-green-400/30 bg-green-400/10" },
];

export function PingModal({ open, onClose, defaultType = "ping", taskId, taskTitle, preselectedUserId }: PingModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [type, setType] = useState(defaultType);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) {
      const { users: u } = await res.json();
      setUsers(u);
      if (preselectedUserId) {
        const found = u.find((us: User) => us._id === preselectedUserId);
        if (found) setSelectedUser(found);
      }
    }
  }, [preselectedUserId]);

  useEffect(() => {
    if (open) { void fetchUsers(); setSent(false); setError(""); setMessage(""); setSearch(""); }
  }, [open, fetchUsers]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      users.filter((u) =>
        (u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      ).slice(0, 6),
    );
  }, [search, users]);

  const send = async () => {
    if (!selectedUser) { setError("Select a team member"); return; }
    setSending(true); setError("");
    try {
      const res = await fetch("/api/pings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserId: selectedUser._id,
          type,
          message: message.trim() || undefined,
          taskId: taskId || undefined,
          taskTitle: taskTitle || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to send");
      setSent(true);
      setTimeout(() => onClose(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative z-10 w-full max-w-md glass rounded-2xl p-5 space-y-4"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Ping a teammate</h3>
                {taskTitle && <p className="text-xs text-slate-500 mt-0.5">Re: {taskTitle}</p>}
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white"><X className="size-4" /></button>
            </div>

            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 py-8"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-green-500/20 border border-green-400/30">
                  <Check className="size-6 text-green-400" />
                </div>
                <p className="text-sm font-medium text-white">Ping sent!</p>
                <p className="text-xs text-slate-500">{selectedUser?.name ?? selectedUser?.email} will see it right away</p>
              </motion.div>
            ) : (
              <>
                {/* Type selector */}
                <div className="grid grid-cols-2 gap-2">
                  {TYPES.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setType(t.id)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                          type === t.id ? t.color : "border-white/8 bg-white/[0.03] text-slate-400 hover:bg-white/6",
                        )}
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium">{t.label}</p>
                          <p className="text-[10px] opacity-70">{t.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Member search */}
                <div>
                  <label className="mb-1.5 block text-xs text-slate-500">Send to</label>
                  {selectedUser ? (
                    <div className="flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2.5">
                      <div className="grid size-6 shrink-0 place-items-center rounded-md bg-blue-500/20 text-[10px] font-semibold text-blue-300">
                        {(selectedUser.name ?? selectedUser.email).slice(0, 2).toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm text-white">{selectedUser.name ?? selectedUser.email}</span>
                      {selectedUser.isOnline && <span className="size-1.5 rounded-full bg-green-400" />}
                      <button onClick={() => setSelectedUser(null)} className="text-slate-500 hover:text-white">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-600" />
                      <input
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search teammates..."
                        className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-4 py-2.5 text-sm outline-none focus:border-blue-400/50"
                      />
                    </div>
                  )}

                  {!selectedUser && filtered.length > 0 && (
                    <div className="mt-1.5 rounded-xl border border-white/8 bg-black/60 divide-y divide-white/[0.04] overflow-hidden">
                      {filtered.map((u) => (
                        <button
                          key={u._id}
                          onClick={() => { setSelectedUser(u); setSearch(""); }}
                          className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                        >
                          <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-700 text-xs font-semibold text-slate-300">
                            {(u.name ?? u.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">{u.name ?? u.email.split("@")[0]}</p>
                            <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {u.focusActive && <span className="text-[9px] text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded-full">Focus</span>}
                            <span className={cn("size-1.5 rounded-full", u.isOnline ? "bg-green-400" : "bg-slate-600")} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Optional message */}
                <div>
                  <label className="mb-1.5 block text-xs text-slate-500">Message <span className="text-slate-700">(optional)</span></label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      type === "ping" ? "Hey, got a sec?" :
                      type === "assign" ? "Please handle this when you can…" :
                      type === "request" ? "Could use your expertise on this…" :
                      "FYI…"
                    }
                    rows={2}
                    maxLength={500}
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-400/50"
                  />
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex justify-end gap-2">
                  <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white">
                    Cancel
                  </button>
                  <button
                    onClick={() => void send()}
                    disabled={sending || !selectedUser}
                    className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2 text-sm font-medium hover:bg-blue-400 disabled:opacity-50 shadow-[0_0_20px_rgba(59,130,246,.35)]"
                  >
                    {sending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
