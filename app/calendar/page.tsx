"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { cn } from "@/lib/utils";

interface CalEvent {
  _id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  color?: string;
  description?: string;
  userId?: { name?: string; email: string };
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 12am–11pm
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899"];
const CELL_HEIGHT = 64; // px per hour row

function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getMonthGrid(date: Date): Date[] {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - start.getDay());

  const end = new Date(lastOfMonth);
  end.setDate(end.getDate() + (6 - end.getDay()));

  const days: Date[] = [];
  const d = new Date(start);
  while (d <= end) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ── Create-event modal ──────────────────────────────────────────────────────
function CreateEventModal({
  defaultDate,
  onClose,
  onCreated,
}: {
  defaultDate?: Date;
  onClose: () => void;
  onCreated: (event: CalEvent) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(
    defaultDate
      ? defaultDate.toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [color, setColor] = useState(COLORS[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!title.trim()) { setError("Title required"); return; }
    setSubmitting(true);
    try {
      const startsAt = new Date(`${date}T${startTime}:00`).toISOString();
      const endsAt = new Date(`${date}T${endTime}:00`).toISOString();
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, startsAt, endsAt, color, description }),
      });
      if (!res.ok) throw new Error("Failed");
      const { event } = await res.json();
      onCreated(event);
      onClose();
    } catch {
      setError("Failed to create event");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">New Event</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          placeholder="Event title..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-blue-400/50"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">Start</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">End</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-blue-400/50"
        />
        <div>
          <label className="mb-1.5 block text-xs text-slate-500">Color</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  "size-6 rounded-full border-2 transition-all hover:scale-110",
                  color === c ? "border-white scale-110" : "border-transparent",
                )}
                style={{ background: c }}
              />
            ))}
          </div>
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
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Event chip (week view) ──────────────────────────────────────────────────
function EventChip({
  evt,
  onDelete,
}: {
  evt: CalEvent;
  onDelete: (id: string) => void;
}) {
  const color = evt.color ?? "#3B82F6";
  const startDate = new Date(evt.startsAt);
  const endDate = new Date(evt.endsAt);
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationMins = Math.max(durationMs / 60000, 30);
  const topPct = (startDate.getMinutes() / 60) * 100;
  const heightPct = Math.min((durationMins / 60) * 100, 100 - topPct);

  return (
    <div
      className="group absolute inset-x-0.5 rounded-lg px-1.5 py-1 text-xs overflow-hidden cursor-default z-10"
      style={{
        top: `${topPct}%`,
        height: `${heightPct}%`,
        minHeight: 22,
        background: `${color}22`,
        borderLeft: `2px solid ${color}`,
        boxShadow: `0 0 0 0.5px ${color}33`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-0.5">
        <span className="font-medium truncate text-[11px] leading-tight">{evt.title}</span>
        <button
          onClick={() => onDelete(evt._id)}
          className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 shrink-0 -mt-0.5"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
      {durationMins >= 30 && (
        <span className="flex items-center gap-0.5 text-[10px] mt-0.5" style={{ color }}>
          <Clock className="size-2.5" />
          {fmtTime(evt.startsAt)}
          {durationMins >= 45 && ` – ${fmtTime(evt.endsAt)}`}
        </span>
      )}
      {evt.userId?.name && durationMins >= 45 && (
        <span className="block text-[10px] text-slate-500 truncate mt-0.5">{evt.userId.name}</span>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "month">("week");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>();

  const weekDays = getWeekDays(currentDate);
  const monthGrid = getMonthGrid(currentDate);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    let from: string, to: string;

    if (view === "week") {
      const wd = getWeekDays(currentDate);
      from = wd[0].toISOString();
      const toDate = new Date(wd[6]);
      toDate.setDate(toDate.getDate() + 1);
      to = toDate.toISOString();
    } else {
      const grid = getMonthGrid(currentDate);
      from = grid[0].toISOString();
      const last = new Date(grid[grid.length - 1]);
      last.setHours(23, 59, 59, 999);
      to = last.toISOString();
    }

    const res = await fetch(`/api/calendar?from=${from}&to=${to}&all=true`);
    if (res.ok) {
      const { events: e } = await res.json();
      setEvents(e);
    }
    setLoading(false);
  }, [currentDate, view]);

  useEffect(() => { void fetchEvents(); }, [fetchEvents]);

  const handleDelete = async (id: string) => {
    setEvents((prev) => prev.filter((e) => e._id !== id));
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
  };

  const eventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(new Date(e.startsAt), day));

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const today = new Date();

  const headerLabel =
    view === "week"
      ? `${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-4">
        {/* Header */}
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
            <p className="text-sm text-slate-500">{headerLabel}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-xl border border-white/10 overflow-hidden">
              {(["week", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-3 py-1.5 text-sm capitalize transition-colors",
                    view === v ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-white/5",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate(-1)}
              className="rounded-xl border border-white/10 p-2 hover:bg-white/5"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="rounded-xl border border-white/10 px-3 py-1.5 text-sm hover:bg-white/5"
            >
              Today
            </button>
            <button
              onClick={() => navigate(1)}
              className="rounded-xl border border-white/10 p-2 hover:bg-white/5"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              onClick={() => { setCreateDate(undefined); setShowCreate(true); }}
              className="flex items-center gap-2 rounded-xl bg-blue-500 px-3 py-1.5 text-sm font-medium hover:bg-blue-400 shadow-[0_0_20px_rgba(59,130,246,.35)]"
            >
              <Plus className="size-4" /> Event
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-slate-500" />
          </div>
        ) : view === "week" ? (
          /* ── WEEK VIEW ─────────────────────────────────────── */
          <div className="glass rounded-2xl overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b border-white/8">
              <div className="p-3" />
              {weekDays.map((day) => {
                const isToday = isSameDay(day, today);
                const dayEvts = eventsForDay(day).length;
                return (
                  <div key={day.toISOString()} className="p-3 text-center border-l border-white/8">
                    <p className="text-xs text-slate-500">{DAYS[day.getDay()]}</p>
                    <p
                      className={cn(
                        "mx-auto mt-1 flex size-7 items-center justify-center rounded-full text-sm font-medium",
                        isToday ? "bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,.6)]" : "text-white",
                      )}
                    >
                      {day.getDate()}
                    </p>
                    {dayEvts > 0 && (
                      <p className="mt-0.5 text-[10px] text-slate-600">{dayEvts} event{dayEvts !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="overflow-y-auto max-h-[600px] no-scrollbar">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="grid grid-cols-8 border-b border-white/5"
                  style={{ minHeight: CELL_HEIGHT }}
                >
                  {/* Hour label */}
                  <div className="p-2 text-right text-xs text-slate-600 pr-3 pt-2 select-none">
                    {hour % 12 || 12}{hour < 12 ? "am" : "pm"}
                  </div>
                  {weekDays.map((day) => {
                    const dayEvts = eventsForDay(day).filter((e) => {
                      const h = new Date(e.startsAt).getHours();
                      return h === hour;
                    });
                    return (
                      <div
                        key={day.toISOString()}
                        className="relative border-l border-white/5 hover:bg-white/[0.02] cursor-pointer"
                        style={{ height: CELL_HEIGHT }}
                        onClick={() => {
                          const d = new Date(day);
                          d.setHours(hour, 0, 0, 0);
                          setCreateDate(d);
                          setShowCreate(true);
                        }}
                      >
                        {dayEvts.map((evt) => (
                          <EventChip key={evt._id} evt={evt} onDelete={handleDelete} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── MONTH VIEW ────────────────────────────────────── */
          <div className="glass rounded-2xl overflow-hidden">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-white/8">
              {DAYS.map((d) => (
                <div key={d} className="py-3 text-center text-xs font-medium text-slate-500">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {monthGrid.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isToday = isSameDay(day, today);
                const dayEvts = eventsForDay(day);
                const isLastRow = idx >= monthGrid.length - 7;

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[110px] p-2 border-b border-r border-white/5 cursor-pointer transition-colors hover:bg-white/[0.025]",
                      !isCurrentMonth && "opacity-30",
                      isLastRow && "border-b-0",
                      (idx + 1) % 7 === 0 && "border-r-0",
                    )}
                    onClick={() => { setCreateDate(day); setShowCreate(true); }}
                  >
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-xs font-medium mb-1.5",
                        isToday
                          ? "bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,.6)]"
                          : "text-slate-400",
                      )}
                    >
                      {day.getDate()}
                    </span>
                    <div className="space-y-0.5">
                      {dayEvts.slice(0, 3).map((evt) => (
                        <div
                          key={evt._id}
                          className="group flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium truncate"
                          style={{
                            background: `${evt.color ?? "#3B82F6"}20`,
                            borderLeft: `2px solid ${evt.color ?? "#3B82F6"}`,
                            color: evt.color ?? "#3B82F6",
                          }}
                          onClick={(e) => e.stopPropagation()}
                          title={`${evt.title} — ${fmtTime(evt.startsAt)}`}
                        >
                          <span className="truncate">{evt.title}</span>
                          <button
                            className="ml-auto opacity-0 group-hover:opacity-100 shrink-0 hover:text-red-400"
                            onClick={(e) => { e.stopPropagation(); void handleDelete(evt._id); }}
                          >
                            <X className="size-2.5" />
                          </button>
                        </div>
                      ))}
                      {dayEvts.length > 3 && (
                        <p className="text-[10px] text-slate-600 pl-1">+{dayEvts.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateEventModal
          defaultDate={createDate}
          onClose={() => setShowCreate(false)}
          onCreated={(e) => setEvents((prev) => [...prev, e])}
        />
      )}
    </AppShell>
  );
}
