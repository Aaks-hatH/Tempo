"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Calendar,
  CheckSquare,
  FileText,
  Hash,
  Home,
  MessageSquare,
  Settings,
  Timer,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { CommandPalette } from "@/components/command-palette";
import { PingModal } from "@/components/ping-modal";
import { CommandCenterBar } from "@/components/command-center-bar";
import { NotificationCenter } from "@/components/notification-center";
import { cn } from "@/lib/utils";
import { useTempoStore } from "@/store/use-tempo-store";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/tasks",     label: "Tasks",     icon: CheckSquare },
  { href: "/calendar",  label: "Calendar",  icon: Calendar },
  { href: "/projects",  label: "Projects",  icon: Users },
  { href: "/chat",      label: "Chat",      icon: MessageSquare },
  { href: "/notes",     label: "Notes",     icon: FileText },
  { href: "/focus",     label: "Focus",     icon: Timer },
  { href: "/call",      label: "Calls",     icon: Video },
  { href: "/settings",  label: "Settings",  icon: Settings },
];

interface TeamUser {
  _id: string;
  name?: string;
  email: string;
  isOnline: boolean;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { setCommandOpen } = useTempoStore();
  const { data: session } = useSession();
  const [pingOpen, setPingOpen] = useState(false);
  const [onlineTeam, setOnlineTeam] = useState<TeamUser[]>([]);

  // Presence heartbeat
  useEffect(() => {
    if (!session?.user?.id) return;
    const sendHeartbeat = () => {
      void fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPage: pathname }),
      });
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 60_000);
    return () => clearInterval(interval);
  }, [session?.user?.id, pathname]);

  // Fetch team presence
  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchTeam = async () => {
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const { users } = await res.json();
          setOnlineTeam(users.filter((u: TeamUser) => u._id !== session?.user?.id));
        }
      } catch { /* noop */ }
    };
    void fetchTeam();
    const interval = setInterval(() => void fetchTeam(), 45_000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : session?.user?.email?.slice(0, 2).toUpperCase() ?? "?";

  const liveOnline = onlineTeam.filter((u) => u.isOnline);

  return (
    <div className="min-h-screen bg-black/20 text-white">
      <div className="pointer-events-none fixed inset-0 grid-mask bg-[linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] bg-[size:72px_72px]" />

      {/* ── Fixed notification bell — always top-right, on every page ── */}
      <div className="fixed top-3.5 right-4 z-50">
        <NotificationCenter />
      </div>

      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 border-r border-white/8 bg-black/50 p-4 backdrop-blur-2xl lg:flex lg:flex-col">
        {/* Logo */}
        <Link href="/dashboard" className="mb-5 flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-white/5">
          <span className="grid size-8 place-items-center rounded-xl border border-blue-400/30 bg-blue-500/15 shadow-[0_0_20px_rgba(59,130,246,.2)]">
            <Hash className="size-3.5 text-blue-300" />
          </span>
          <span>
            <strong className="block text-sm">Tempo</strong>
            <span className="text-xs text-slate-500">Command Center</span>
          </span>
        </Link>

        {/* Search */}
        <button
          onClick={() => setCommandOpen(true)}
          className="mb-2 flex w-full items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-500 hover:bg-white/6 hover:text-slate-400"
        >
          <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="flex-1 text-left text-xs">Search everything...</span>
          <kbd className="rounded border border-white/10 bg-white/5 px-1 text-[10px]">⌘K</kbd>
        </button>

        {/* Ping button */}
        <button
          onClick={() => setPingOpen(true)}
          className="mb-4 flex w-full items-center gap-2 rounded-xl border border-yellow-400/20 bg-yellow-400/[0.05] px-3 py-2 text-sm text-yellow-400/80 hover:bg-yellow-400/10 hover:text-yellow-300 transition-all"
        >
          <Zap className="size-3.5" />
          <span className="flex-1 text-left text-xs font-medium">Ping a teammate</span>
          <span className="text-[10px] text-yellow-400/40">⚡</span>
        </button>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-white/6 hover:text-white",
                  active && "bg-white/8 text-white",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
                {active && (
                  <motion.span
                    layoutId="nav-dot"
                    className="ml-auto size-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,.9)]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Online team strip */}
        {liveOnline.length > 0 && (
          <div className="mt-3 mb-2">
            <p className="mb-1.5 px-1 text-[10px] font-semibold tracking-widest text-slate-700 uppercase">Online Now</p>
            <div className="space-y-0.5">
              {liveOnline.slice(0, 4).map((u) => (
                <button
                  key={u._id}
                  onClick={() => setPingOpen(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5 transition-colors group"
                >
                  <div className="relative shrink-0">
                    <div className="grid size-5 place-items-center rounded-md bg-slate-800 text-[8px] font-semibold text-slate-300">
                      {(u.name ?? u.email).slice(0, 2).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full bg-green-400 shadow-[0_0_4px_rgba(34,197,94,.8)] ring-1 ring-black" />
                  </div>
                  <span className="flex-1 truncate text-[11px] text-slate-500 group-hover:text-slate-300">
                    {u.name ?? u.email.split("@")[0]}
                  </span>
                  <Zap className="size-3 text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {liveOnline.length > 4 && (
                <p className="px-2 text-[10px] text-slate-700">+{liveOnline.length - 4} more online</p>
              )}
            </div>
          </div>
        )}

        {/* User card */}
        <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-500/20 text-xs font-semibold text-blue-200">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">
                {session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "—"}
              </p>
              <p className="truncate text-[11px] text-slate-500">{session?.user?.email}</p>
            </div>
            <span className="size-1.5 shrink-0 rounded-full bg-green-400 shadow-[0_0_6px_rgba(34,197,94,.8)]" />
          </div>
        </div>
      </aside>

      <main className="relative z-10 min-h-screen px-4 pb-24 pt-4 lg:ml-60 lg:px-8 lg:py-8">
        <CommandCenterBar />
        {children}
      </main>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-4 left-4 right-4 z-40 flex items-center justify-around rounded-2xl border border-white/8 bg-black/90 py-2 backdrop-blur-2xl lg:hidden">
        {navItems.slice(0, 6).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-slate-400 hover:text-white",
                active && "text-blue-300",
              )}
            >
              <Icon className="size-5" />
              <span className="text-[9px]">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setPingOpen(true)}
          className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-yellow-400"
        >
          <Zap className="size-5" />
          <span className="text-[9px]">Ping</span>
        </button>
      </div>

      <CommandPalette />
      <PingModal open={pingOpen} onClose={() => setPingOpen(false)} />
    </div>
  );
}
