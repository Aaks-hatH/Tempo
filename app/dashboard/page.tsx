"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  CheckSquare,
  Clock,
  Flame,
  Hash,
  Loader2,
  Timer,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

interface DashboardData {
  myTasksByStatus: { todo: number; inProgress: number; review: number; done: number };
  overdueCount: number;
  urgentTasks: Array<{ _id: string; title: string; priority: string; dueAt?: string }>;
  teamTaskCount: number;
  projectCount: number;
  todayEvents: Array<{ _id: string; title: string; startsAt: string; endsAt: string }>;
  recentActivity: Array<{
    _id: string;
    type: string;
    meta: Record<string, unknown>;
    createdAt: string;
    userId: { name?: string; email: string };
  }>;
  focusMinutesThisWeek: number;
  dailyFocus: Array<{ day: string; minutes: number }>;
}

interface TeamMember {
  _id: string;
  name?: string;
  email: string;
  isOnline: boolean;
  focusActive: boolean;
  inCall: boolean;
  callRoomId?: string;
}

const activityIcon: Record<string, React.ElementType> = {
  task_created: CheckSquare,
  task_completed: CheckCircle2,
  focus_started: Timer,
  focus_completed: Zap,
  project_created: Hash,
  note_created: Activity,
  message_sent: Activity,
  call_started: Video,
};

const activityLabel: Record<string, (meta: Record<string, unknown>) => string> = {
  task_created: (m) => `created task "${m.title ?? "—"}"`,
  task_completed: (m) => `completed "${m.title ?? "—"}"`,
  focus_started: (m) => `started ${m.minutes}min focus`,
  focus_completed: (m) => `completed ${m.minutes}min focus`,
  project_created: (m) => `created project "${m.name ?? "—"}"`,
  note_created: (m) => `created note "${m.title ?? "—"}"`,
  message_sent: () => `sent a message`,
  call_started: () => `started a call`,
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [statsRes, teamRes] = await Promise.all([
      fetch("/api/dashboard"),
      fetch("/api/users"),
    ]);
    if (statsRes.ok) {
      const json = await statsRes.json();
      setData(json);
    }
    if (teamRes.ok) {
      const json = await teamRes.json();
      setTeam(json.users);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onlineCount = team.filter((u) => u.isOnline).length;

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-slate-500" />
        </div>
      </AppShell>
    );
  }

  const totalTasks = data
    ? data.myTasksByStatus.todo +
      data.myTasksByStatus.inProgress +
      data.myTasksByStatus.review +
      data.myTasksByStatus.done
    : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(34,197,94,.8)] animate-pulse" />
              <span className="text-xs text-slate-500">
                {onlineCount} of {team.length} online
              </span>
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Team Operations</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/call"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/8"
            >
              <Video className="size-4" />
              Start call
            </Link>
            <Link
              href="/focus"
              className="flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-medium shadow-[0_0_20px_rgba(59,130,246,.4)] hover:bg-blue-400"
            >
              <Zap className="size-4" />
              Focus
            </Link>
          </div>
        </header>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              label: "My Tasks",
              value: totalTasks,
              sub: `${data?.myTasksByStatus.inProgress ?? 0} in progress`,
              icon: CheckSquare,
              color: "text-blue-400",
              href: "/tasks",
            },
            {
              label: "Overdue",
              value: data?.overdueCount ?? 0,
              sub: "need attention",
              icon: AlertTriangle,
              color: data?.overdueCount ? "text-red-400" : "text-slate-500",
              href: "/tasks",
            },
            {
              label: "Projects",
              value: data?.projectCount ?? 0,
              sub: `${data?.teamTaskCount ?? 0} open tasks`,
              icon: Hash,
              color: "text-purple-400",
              href: "/projects",
            },
            {
              label: "Focus hrs",
              value: Math.round((data?.focusMinutesThisWeek ?? 0) / 60 * 10) / 10,
              sub: "this week",
              icon: Timer,
              color: "text-green-400",
              href: "/focus",
            },
          ].map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="glass rounded-2xl p-4 hover:border-white/25 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                  <p className={cn("mt-1 text-2xl font-semibold", stat.color)}>{stat.value}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{stat.sub}</p>
                </div>
                <stat.icon className={cn("size-5 mt-0.5", stat.color)} />
              </div>
            </Link>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Focus chart */}
          <div className="glass rounded-2xl p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Focus activity — 7 days</h2>
              <span className="text-xs text-slate-500">
                {data?.focusMinutesThisWeek ?? 0}m total
              </span>
            </div>
            {data?.dailyFocus && data.dailyFocus.some((d) => d.minutes > 0) ? (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={data.dailyFocus}>
                  <defs>
                    <linearGradient id="focusGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "#0a0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#94a3b8" }}
                    formatter={(v: number) => [`${v}m`, "Focus"]}
                  />
                  <Area type="monotone" dataKey="minutes" stroke="#3B82F6" fill="url(#focusGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-36 flex-col items-center justify-center gap-2">
                <Timer className="size-8 text-slate-700" />
                <p className="text-sm text-slate-600">No focus sessions yet this week</p>
                <Link href="/focus" className="text-xs text-blue-400 hover:text-blue-300">
                  Start your first session →
                </Link>
              </div>
            )}
          </div>

          {/* Team presence */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Team</h2>
              <span className="text-xs text-slate-500">{onlineCount} online</span>
            </div>
            {team.length === 0 ? (
              <p className="text-sm text-slate-600">No team members yet</p>
            ) : (
              <div className="space-y-2">
                {team.map((member) => (
                  <div key={member._id} className="flex items-center gap-2.5 rounded-xl p-2 hover:bg-white/5">
                    <div className="relative">
                      <div className="grid size-8 place-items-center rounded-lg bg-slate-700 text-xs font-semibold text-white">
                        {(member.name ?? member.email).slice(0, 2).toUpperCase()}
                      </div>
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-black",
                        member.isOnline ? "bg-green-400" : "bg-slate-600",
                      )} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {member.name ?? member.email.split("@")[0]}
                        {member._id === session?.user?.id && (
                          <span className="ml-1 text-xs text-slate-600">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {member.inCall ? (
                          <span className="text-green-400">📞 In call</span>
                        ) : member.focusActive ? (
                          <span className="text-blue-400">🎯 Focusing</span>
                        ) : member.isOnline ? (
                          "Online"
                        ) : (
                          "Offline"
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/call"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] py-2 text-sm text-slate-400 hover:bg-white/8 hover:text-white"
            >
              <Video className="size-4" />
              Start a call
            </Link>
          </div>
        </div>

        {/* Bottom grid */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Urgent tasks */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Urgent tasks</h2>
              <Link href="/tasks" className="text-xs text-blue-400 hover:text-blue-300">View all</Link>
            </div>
            {data?.urgentTasks?.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <CheckCircle2 className="size-8 text-green-500/50" />
                <p className="text-sm text-slate-600">All clear — no urgent tasks</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(data?.urgentTasks ?? []).map((task) => (
                  <Link
                    key={task._id}
                    href="/tasks"
                    className="flex items-start gap-2.5 rounded-xl p-2.5 hover:bg-white/5"
                  >
                    <span className="mt-0.5 size-2 shrink-0 rounded-full bg-red-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{task.title}</p>
                      {task.dueAt && (
                        <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(task.dueAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
                <Link
                  href="/tasks"
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-white pt-1"
                >
                  All tasks <ArrowRight className="size-3" />
                </Link>
              </div>
            )}
          </div>

          {/* Today's schedule */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Today</h2>
              <Link href="/calendar" className="text-xs text-blue-400 hover:text-blue-300">Calendar</Link>
            </div>
            {data?.todayEvents?.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <Calendar className="size-8 text-slate-700" />
                <p className="text-sm text-slate-600">No events today</p>
                <Link href="/calendar" className="text-xs text-blue-400 hover:text-blue-300">
                  Add an event
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {(data?.todayEvents ?? []).map((event) => (
                  <div key={event._id} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-white/5">
                    <span className="h-8 w-0.5 rounded-full bg-blue-500/60 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-slate-500">
                        {formatTime(event.startsAt)} – {formatTime(event.endsAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Activity</h2>
              <Users className="size-4 text-slate-600" />
            </div>
            {data?.recentActivity?.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-2">
                <Flame className="size-8 text-slate-700" />
                <p className="text-sm text-slate-600">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(data?.recentActivity ?? []).slice(0, 6).map((act) => {
                  const Icon = activityIcon[act.type] ?? Activity;
                  const label = activityLabel[act.type]?.(act.meta) ?? act.type;
                  const who = act.userId?.name ?? act.userId?.email?.split("@")[0] ?? "Someone";
                  return (
                    <div key={act._id} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-white/5 text-slate-400">
                        <Icon className="size-3" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-300">
                          <span className="font-medium text-white">{who}</span>{" "}
                          {label}
                        </p>
                        <p className="text-[11px] text-slate-600">{timeAgo(act.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
