"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellRing,
  CheckCheck,
  ClipboardList,
  MessageSquare,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PingFrom {
  _id: string;
  name?: string;
  email: string;
}

interface Ping {
  _id: string;
  type: "ping" | "assign" | "mention" | "request";
  message?: string;
  taskTitle?: string;
  read: boolean;
  createdAt: string;
  fromUserId: PingFrom;
}

interface Toast {
  id: string;
  ping: Ping;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

const TYPE_CONFIG = {
  ping:    { icon: Zap,          label: "Pinged you",           color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20" },
  assign:  { icon: ClipboardList, label: "Assigned a task",     color: "text-blue-400",   bg: "bg-blue-400/10 border-blue-400/20"   },
  mention: { icon: MessageSquare, label: "Mentioned you",       color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20"},
  request: { icon: UserPlus,      label: "Requested your help", color: "text-green-400",  bg: "bg-green-400/10 border-green-400/20" },
};

const lastDeviceNotifAt = new Map<string, number>();

function getSeenIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem("tempo_seen_pings");
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}
function addSeenId(id: string) {
  try {
    const set = getSeenIds();
    set.add(id);
    sessionStorage.setItem("tempo_seen_pings", JSON.stringify([...set].slice(-500)));
  } catch { /* noop */ }
}

function fireDesktopNotification(ping: Ping) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const senderId = ping.fromUserId._id;
  const last = lastDeviceNotifAt.get(senderId) ?? 0;
  if (Date.now() - last < 60_000) return;
  lastDeviceNotifAt.set(senderId, Date.now());
  const senderName = ping.fromUserId.name ?? ping.fromUserId.email.split("@")[0];
  const cfg = TYPE_CONFIG[ping.type] ?? TYPE_CONFIG.ping;
  let body = `${senderName} ${cfg.label.toLowerCase()}`;
  if (ping.taskTitle) body += ` — ${ping.taskTitle}`;
  if (ping.message)   body += `\n"${ping.message}"`;
  const n = new Notification(`Tempo — ${cfg.label}`, { body, tag: ping._id, requireInteraction: false, silent: false });
  setTimeout(() => n.close(), 6000);
}

// ── Toast portal ──────────────────────────────────────────────────────────────

function ToastPortal({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none" style={{ maxWidth: "22rem" }}>
      <AnimatePresence mode="sync">
        {toasts.map(({ id, ping }) => {
          const cfg = TYPE_CONFIG[ping.type] ?? TYPE_CONFIG.ping;
          const Icon = cfg.icon;
          const senderName = ping.fromUserId.name ?? ping.fromUserId.email.split("@")[0];
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, x: 80, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 bg-black/95 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,.7)] backdrop-blur-xl"
            >
              <div className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border", cfg.bg)}>
                <Icon className={cn("size-4", cfg.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white">
                  {senderName}{" "}
                  <span className="font-normal text-slate-400">{cfg.label.toLowerCase()}</span>
                </p>
                {ping.taskTitle && <p className="mt-0.5 truncate text-[11px] text-slate-500">Task: {ping.taskTitle}</p>}
                {ping.message   && <p className="mt-0.5 text-[11px] text-slate-400 italic line-clamp-2">&ldquo;{ping.message}&rdquo;</p>}
              </div>
              <button onClick={() => onDismiss(id)} className="mt-0.5 shrink-0 text-slate-600 hover:text-slate-400 transition-colors">
                <X className="size-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

// ── Permission banner portal ──────────────────────────────────────────────────

function NotificationPermissionBanner({ onRequest, onDismiss }: { onRequest: () => void; onDismiss: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-3 rounded-2xl border border-yellow-400/30 bg-black/95 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,.6)] backdrop-blur-xl"
      style={{ maxWidth: "calc(100vw - 2rem)" }}
    >
      <BellRing className="size-4 text-yellow-400 shrink-0 animate-pulse" />
      <p className="text-xs text-slate-300">Enable desktop notifications to get alerted when teammates ping you.</p>
      <button
        onClick={onRequest}
        className="shrink-0 rounded-lg border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[11px] font-semibold text-yellow-300 hover:bg-yellow-400/20 transition-colors"
      >
        Enable
      </button>
      <button onClick={onDismiss} className="shrink-0 text-slate-600 hover:text-slate-400 transition-colors">
        <X className="size-3.5" />
      </button>
    </motion.div>,
    document.body,
  );
}

// ── Dropdown panel portal ─────────────────────────────────────────────────────
// Rendered via portal so it escapes backdrop-filter / overflow stacking contexts
// and is always fully visible even at the very top-right of the viewport.

interface PanelPortalProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  panelRef: React.RefObject<HTMLDivElement | null>;
  pings: Ping[];
  loading: boolean;
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onDismissPing: (id: string) => void;
  onRequestPermission: () => void;
}

function DropdownPanelPortal({
  open, anchorRef, panelRef,
  pings, loading, unreadCount,
  onMarkAllRead, onMarkRead, onDismissPing, onRequestPermission,
}: PanelPortalProps) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ top: 60, right: 16 });

  useEffect(() => { setMounted(true); }, []);

  // Recompute position every time the panel opens
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    });
  }, [open, anchorRef]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            zIndex: 9990,
            width: "20rem",
            maxWidth: "calc(100vw - 2rem)",
            maxHeight: "calc(100vh - 5rem)",
          }}
          className="glass rounded-2xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,.5)] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="size-3.5 text-blue-400" />
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-blue-300">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {typeof window !== "undefined" && "Notification" in window && Notification.permission === "default" && (
                <button
                  onClick={onRequestPermission}
                  className="text-[10px] text-yellow-400/70 hover:text-yellow-300 border border-yellow-400/20 rounded px-1.5 py-0.5"
                  title="Enable desktop alerts"
                >
                  Enable alerts
                </button>
              )}
              {pings.length > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300"
                >
                  <CheckCheck className="size-3" /> All read
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto no-scrollbar flex-1">
            {loading && pings.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-slate-600 text-sm">Loading…</div>
            ) : pings.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-600">
                <Bell className="size-6 opacity-30" />
                <p className="text-xs">You&apos;re all caught up</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {pings.map((ping) => {
                  const cfg = TYPE_CONFIG[ping.type] ?? TYPE_CONFIG.ping;
                  const Icon = cfg.icon;
                  const senderName = ping.fromUserId.name ?? ping.fromUserId.email.split("@")[0];
                  return (
                    <motion.div
                      key={ping._id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className={cn(
                        "group relative flex gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer",
                        !ping.read && "bg-blue-500/[0.03]",
                      )}
                      onClick={() => { if (!ping.read) onMarkRead(ping._id); }}
                    >
                      {!ping.read && (
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 size-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(59,130,246,.9)]" />
                      )}
                      <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border", cfg.bg)}>
                        <Icon className={cn("size-3.5", cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white leading-snug">
                          <span className="font-semibold">{senderName}</span>{" "}
                          <span className="text-slate-400">{cfg.label}</span>
                        </p>
                        {ping.taskTitle && <p className="mt-0.5 truncate text-[11px] text-slate-500">Task: {ping.taskTitle}</p>}
                        {ping.message   && <p className="mt-0.5 text-[11px] text-slate-400 italic">&ldquo;{ping.message}&rdquo;</p>}
                        <p className="mt-1 text-[10px] text-slate-600">{timeAgo(ping.createdAt)}</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDismissPing(ping._id); }}
                        className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-slate-400 transition-opacity"
                      >
                        <X className="size-3" />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {pings.length > 0 && (
            <div className="border-t border-white/8 px-4 py-2.5 shrink-0">
              <p className="text-center text-[11px] text-slate-600">
                {pings.length} notification{pings.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NotificationCenter() {
  const [open, setOpen]             = useState(false);
  const [pings, setPings]           = useState<Ping[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [toasts, setToasts]         = useState<Toast[]>([]);
  const [showPermBanner, setShowPermBanner] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef  = useRef<HTMLDivElement>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const seenIds   = useRef<Set<string>>(new Set());

  const dismissToast = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const addToast = useCallback((ping: Ping) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-3), { id, ping }]);
    setTimeout(() => dismissToast(id), 5000);
  }, []);

  // Ask for permission after a short delay on first mount (banner prompt)
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      const t = setTimeout(() => setShowPermBanner(true), 2500);
      return () => clearTimeout(t);
    }
  }, []);

  const requestPermission = async () => {
    setShowPermBanner(false);
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    // If granted, fire a welcome notification so the user knows it worked
    if (result === "granted") {
      const n = new Notification("Tempo notifications enabled ✓", {
        body: "You'll now receive alerts when teammates ping you.",
        silent: true,
      });
      setTimeout(() => n.close(), 4000);
    }
  };

  const fetchPings = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res = await fetch("/api/pings");
      if (res.ok) {
        const data = await res.json();
        const incoming: Ping[] = data.pings ?? [];
        const persisted = getSeenIds();
        incoming.forEach((ping) => {
          if (!ping.read && !seenIds.current.has(ping._id) && !persisted.has(ping._id)) {
            seenIds.current.add(ping._id);
            addSeenId(ping._id);
            const ageMs = Date.now() - new Date(ping.createdAt).getTime();
            if (ageMs < 120_000) { fireDesktopNotification(ping); addToast(ping); }
          } else {
            seenIds.current.add(ping._id);
          }
        });
        setPings(incoming);
        setUnreadCount(data.unreadCount ?? 0);
      }
    } catch { /* noop */ }
    finally { if (!quiet) setLoading(false); }
  }, [addToast]);

  useEffect(() => {
    void fetchPings();
    pollRef.current = setInterval(() => void fetchPings(true), 12_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchPings]);

  // Click-outside: close panel when clicking outside both button and panel
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedButton = buttonRef.current?.contains(target);
      const clickedPanel  = panelRef.current?.contains(target);
      if (!clickedButton && !clickedPanel) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async () => {
    await fetch("/api/pings?action=read-all", { method: "PATCH" });
    setPings((prev) => prev.map((p) => ({ ...p, read: true })));
    setUnreadCount(0);
  };

  const dismissPing = async (pingId: string) => {
    await fetch("/api/pings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pingId, dismissed: true }),
    });
    setPings((prev) => prev.filter((p) => p._id !== pingId));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markRead = async (pingId: string) => {
    await fetch("/api/pings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pingId, read: true }),
    });
    setPings((prev) => prev.map((p) => (p._id === pingId ? { ...p, read: true } : p)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleBellClick = async () => {
    // Request permission on first bell-click if not yet asked
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      setShowPermBanner(false);
      await Notification.requestPermission();
    }
    const next = !open;
    setOpen(next);
    if (next) void markAllRead();
  };

  return (
    <>
      {/* Toast notifications */}
      <ToastPortal toasts={toasts} onDismiss={dismissToast} />

      {/* Permission banner */}
      <AnimatePresence>
        {showPermBanner && (
          <NotificationPermissionBanner
            onRequest={() => void requestPermission()}
            onDismiss={() => setShowPermBanner(false)}
          />
        )}
      </AnimatePresence>

      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={() => void handleBellClick()}
        className={cn(
          "relative flex items-center justify-center size-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-all",
          open && "bg-white/8 text-white",
        )}
        title="Notifications"
      >
        {unreadCount > 0 ? <BellRing className="size-4 text-blue-400" /> : <Bell className="size-4" />}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white shadow-[0_0_10px_rgba(59,130,246,.8)]"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel — portal so it's never clipped */}
      <DropdownPanelPortal
        open={open}
        anchorRef={buttonRef}
        panelRef={panelRef}
        pings={pings}
        loading={loading}
        unreadCount={unreadCount}
        onMarkAllRead={() => void markAllRead()}
        onMarkRead={(id) => void markRead(id)}
        onDismissPing={(id) => void dismissPing(id)}
        onRequestPermission={() => void requestPermission()}
      />
    </>
  );
}

export function NotificationBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-blue-500 text-[8px] font-bold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function useUnreadPings() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch("/api/pings?unread=true");
        if (res.ok) { const d = await res.json(); setCount(d.unreadCount ?? 0); }
      } catch { /* noop */ }
    };
    void fetch_();
    const interval = setInterval(() => void fetch_(), 15_000);
    return () => clearInterval(interval);
  }, []);
  return count;
}
