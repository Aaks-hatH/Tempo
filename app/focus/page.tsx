"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Loader2, Pause, Play, RotateCcw, Zap } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Focus", minutes: 25, color: "bg-blue-500", ring: "#3B82F6", glow: "shadow-[0_0_40px_rgba(59,130,246,.5)]" },
  { label: "Short break", minutes: 5, color: "bg-emerald-500", ring: "#10B981", glow: "shadow-[0_0_40px_rgba(16,185,129,.5)]" },
  { label: "Long break", minutes: 15, color: "bg-purple-500", ring: "#8B5CF6", glow: "shadow-[0_0_40px_rgba(139,92,246,.5)]" },
  { label: "Deep work", minutes: 90, color: "bg-orange-500", ring: "#F97316", glow: "shadow-[0_0_40px_rgba(249,115,22,.5)]" },
];

interface RawSession {
  startedAt: string;
  endedAt?: string;
  minutes: number;
}

interface FocusStats {
  streak: number;
  weeklyMinutes: number;
  weeklyCount: number;
  dailyFocus: Array<{ day: string; minutes: number }>;
}

export default function FocusPage() {
  const [selected, setSelected] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PRESETS[0].minutes * 60);
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [stats, setStats] = useState<FocusStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/focus");
    if (res.ok) {
      const data = await res.json();

      // Compute daily focus for the last 7 days from raw sessions
      const dayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
      const dailyFocus = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        const minutes = (data.sessions as RawSession[] ?? [])
          .filter((s) => {
            const sd = new Date(s.startedAt);
            return sd >= d && sd < next && s.endedAt;
          })
          .reduce((sum, s) => sum + s.minutes, 0);
        return { day: dayLabels[d.getDay()], minutes };
      });

      setStats({ streak: data.streak, weeklyMinutes: data.weeklyMinutes, weeklyCount: data.weeklyCount, dailyFocus });
    }
    setLoadingStats(false);
  }, []);

  useEffect(() => { void fetchStats(); }, [fetchStats]);

  const totalSeconds = PRESETS[selected].minutes * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const preset = PRESETS[selected];

  useEffect(() => {
    if (running) {
      document.title = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} — Tempo Focus`;
    } else {
      document.title = "Focus — Tempo";
    }
    return () => { document.title = "Tempo"; };
  }, [running, minutes, seconds]);

  const startSession = useCallback(async () => {
    const res = await fetch("/api/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minutes: PRESETS[selected].minutes }),
    });
    if (res.ok) {
      const { session: s } = await res.json();
      setSessionId(s._id);
    }
  }, [selected]);

  const completeSession = useCallback(async (id: string) => {
    await fetch(`/api/focus/${id}`, { method: "PATCH" });
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            completedRef.current = true;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (completedRef.current && sessionId) {
        completedRef.current = false;
        void completeSession(sessionId);
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, sessionId, completeSession]);

  // Start timer instantly; fire API in background
  const handleStart = () => {
    if (!running) {
      if (timeLeft === totalSeconds) {
        void startSession();
      }
      setRunning(true);
    } else {
      setRunning(false);
    }
  };

  const handleReset = () => {
    setRunning(false);
    setTimeLeft(PRESETS[selected].minutes * 60);
    setSessionId(null);
    completedRef.current = false;
  };

  // Allow preset change even while running — reset timer
  const handlePresetChange = (idx: number) => {
    setSelected(idx);
    setRunning(false);
    setTimeLeft(PRESETS[idx].minutes * 60);
    setSessionId(null);
    completedRef.current = false;
  };

  // Arc circumference
  const R = 100;
  const circ = 2 * Math.PI * R;
  const dash = circ * (1 - progress / 100);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-slate-700 tracking-widest">$ tempo focus --mode pomodoro</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Focus</h1>
          <p className="text-sm text-slate-500">Pomodoro timer with session tracking</p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
          {/* Timer card */}
          <div className="glass rounded-2xl p-8 flex flex-col items-center justify-center gap-6">
            {/* Preset tabs — always clickable */}
            <div className="flex gap-2 flex-wrap justify-center">
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => handlePresetChange(i)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-sm font-medium transition-all",
                    selected === i
                      ? `${p.color} text-white shadow-md`
                      : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Clock face */}
            <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
              <svg className="absolute pointer-events-none" width="240" height="240" viewBox="0 0 240 240">
                {/* Track */}
                <circle cx="120" cy="120" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                {/* Progress arc */}
                <circle
                  cx="120" cy="120" r={R}
                  fill="none"
                  stroke={preset.ring}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={dash}
                  transform="rotate(-90 120 120)"
                  style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s ease", filter: running ? `drop-shadow(0 0 8px ${preset.ring})` : "none" }}
                />
                {/* Tick marks */}
                {Array.from({ length: 60 }, (_, k) => {
                  const angle = (k / 60) * 360 - 90;
                  const rad = (angle * Math.PI) / 180;
                  const isMajor = k % 5 === 0;
                  const inner = isMajor ? 86 : 92;
                  const outer = 96;
                  return (
                    <line
                      key={k}
                      x1={120 + inner * Math.cos(rad)} y1={120 + inner * Math.sin(rad)}
                      x2={120 + outer * Math.cos(rad)} y2={120 + outer * Math.sin(rad)}
                      stroke="rgba(255,255,255,0.12)" strokeWidth={isMajor ? 2 : 1}
                    />
                  );
                })}
              </svg>
              <div className="text-center z-10">
                <p className="text-6xl font-semibold tracking-tighter tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </p>
                <p className="mt-1 text-sm text-slate-500">{preset.label}</p>
                {running && (
                  <p className="mt-1 text-[11px] text-slate-600 animate-pulse">in progress</p>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                onClick={handleStart}
                className={cn(
                  "flex items-center gap-2 rounded-full px-8 py-3 text-base font-semibold transition-all hover:scale-105 active:scale-95",
                  preset.color, preset.glow,
                )}
              >
                {running ? <Pause className="size-5" /> : <Play className="size-5" />}
                {running ? "Pause" : timeLeft === totalSeconds ? "Start" : "Resume"}
              </button>
            </div>
          </div>

          {/* Stats panel */}
          <div className="space-y-4">
            {loadingStats ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-slate-500" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass rounded-2xl p-4 text-center">
                    <Flame className="size-5 text-orange-400 mx-auto" />
                    <p className="mt-2 text-2xl font-semibold">{stats?.streak ?? 0}</p>
                    <p className="text-xs text-slate-500">day streak</p>
                  </div>
                  <div className="glass rounded-2xl p-4 text-center">
                    <Zap className="size-5 text-blue-400 mx-auto" />
                    <p className="mt-2 text-2xl font-semibold">{stats?.weeklyCount ?? 0}</p>
                    <p className="text-xs text-slate-500">sessions this week</p>
                  </div>
                </div>

                <div className="glass rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">Weekly focus</h3>
                    <span className="text-xs text-slate-500">
                      {Math.round(((stats?.weeklyMinutes ?? 0) / 60) * 10) / 10}h total
                    </span>
                  </div>
                  <div className="flex items-end gap-1.5 h-20">
                    {(stats?.dailyFocus ?? []).map((d, i) => {
                      const max = Math.max(...(stats?.dailyFocus ?? []).map((x) => x.minutes), 1);
                      const pct = (d.minutes / max) * 100;
                      const isToday = i === 6;
                      return (
                        <div key={i} className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className={cn(
                              "w-full rounded-t-md transition-all",
                              isToday ? "bg-blue-500/50 hover:bg-blue-500/70" : "bg-white/10 hover:bg-white/20",
                            )}
                            style={{ height: `${Math.max(pct, 4)}%`, minHeight: 4 }}
                            title={`${d.minutes}m`}
                          />
                          <span className={cn("text-[10px]", isToday ? "text-blue-400" : "text-slate-600")}>{d.day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="glass rounded-2xl p-4">
                  <h3 className="text-sm font-medium mb-3">How to use</h3>
                  <div className="space-y-2 text-xs text-slate-500">
                    <p>1. Pick a preset — switching resets the timer</p>
                    <p>2. Click Start to begin immediately</p>
                    <p>3. Stay on task until the timer ends</p>
                    <p>4. Take a short or long break</p>
                    <p>5. Repeat to build your streak</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
