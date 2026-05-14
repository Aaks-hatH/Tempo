"use client";

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const EMPTY_WEEK = [
  { day: "Mon", focus: 0, tasks: 0 },
  { day: "Tue", focus: 0, tasks: 0 },
  { day: "Wed", focus: 0, tasks: 0 },
  { day: "Thu", focus: 0, tasks: 0 },
  { day: "Fri", focus: 0, tasks: 0 },
  { day: "Sat", focus: 0, tasks: 0 },
  { day: "Sun", focus: 0, tasks: 0 },
];

interface ChartData {
  day: string;
  focus?: number;
  tasks?: number;
  minutes?: number;
}

export function ProductivityChart({ data = EMPTY_WEEK }: { data?: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{ background: "#0a0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#94a3b8" }}
        />
        <Area type="monotone" dataKey="focus" stroke="#3B82F6" fill="url(#grad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TaskBarChart({ data = EMPTY_WEEK }: { data?: ChartData[] }) {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data}>
        <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{ background: "#0a0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: "#94a3b8" }}
        />
        <Bar dataKey="tasks" fill="#3B82F6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
