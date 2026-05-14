"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Activity, Clock, Users, CheckSquare, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusData {
  onlineCount: number;
  teamTaskCount: number;
  myTasksDueToday: number;
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="tabular-nums">
      {time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "OVERVIEW",
  "/tasks":     "TASK BOARD",
  "/calendar":  "CALENDAR",
  "/projects":  "PROJECTS",
  "/chat":      "COMMUNICATIONS",
  "/notes":     "NOTES",
  "/focus":     "FOCUS MODE",
  "/call":      "CALL CENTER",
  "/settings":  "SYSTEM SETTINGS",
};

export function CommandCenterBar() {
  const pathname = usePathname();
  const [data, setData] = useState<StatusData>({ onlineCount: 0, teamTaskCount: 0, myTasksDueToday: 0 });
  const [online, setOnline] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const [usersRes, tasksRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/tasks?all=false&status=TODO"),
      ]);
      if (usersRes.ok && tasksRes.ok) {
        const { users } = await usersRes.json();
        const { tasks } = await tasksRes.json();
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const dueToday = tasks.filter((t: { dueAt?: string }) => t.dueAt && new Date(t.dueAt) <= today).length;
        setData({
          onlineCount: users.filter((u: { isOnline: boolean }) => u.isOnline).length,
          teamTaskCount: tasks.length,
          myTasksDueToday: dueToday,
        });
        setOnline(true);
      }
    } catch { setOnline(false); }
  }, []);

  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(() => void fetchStatus(), 30_000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const pageLabel = PAGE_LABELS[pathname] ?? "WORKSPACE";

  return (
    <div className="mb-6 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2 backdrop-blur-sm">
      {/* Left: Page context */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className={cn("size-1.5 rounded-full animate-pulse", online ? "bg-green-400 shadow-[0_0_6px_rgba(34,197,94,.9)]" : "bg-red-400")} />
          {online ? <Wifi className="size-3 text-green-500/60" /> : <WifiOff className="size-3 text-red-500/60" />}
        </div>
        <span className="text-[10px] font-mono font-semibold tracking-[0.15em] text-slate-600">TEMPO://</span>
        <span className="text-[10px] font-mono font-semibold tracking-[0.15em] text-blue-400/80">{pageLabel}</span>
      </div>

      {/* Center: Live metrics */}
      <div className="hidden md:flex items-center gap-5">
        <Metric icon={Users}       value={data.onlineCount}      label="online"     color="text-green-400" />
        <div className="h-3 w-px bg-white/10" />
        <Metric icon={CheckSquare} value={data.teamTaskCount}    label="open tasks" color="text-blue-400" />
        {data.myTasksDueToday > 0 && (
          <>
            <div className="h-3 w-px bg-white/10" />
            <Metric icon={Activity} value={data.myTasksDueToday} label="due today"  color="text-orange-400" urgent />
          </>
        )}
      </div>

      {/* Right: Clock only — bell lives in the fixed top-right overlay in app-shell */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-slate-600">
          <Clock className="size-3 text-slate-700" />
          <LiveClock />
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon, value, label, color, urgent,
}: {
  icon: React.ElementType; value: number; label: string; color: string; urgent?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", urgent && "animate-pulse")}>
      <Icon className={cn("size-3", color)} />
      <span className={cn("text-[10px] font-mono font-semibold", color)}>{value}</span>
      <span className="text-[10px] text-slate-700">{label}</span>
    </div>
  );
}
