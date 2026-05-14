import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import FocusSession from "@/lib/models/FocusSession";
import Activity from "@/lib/models/Activity";
import Presence from "@/lib/models/Presence";

const createSchema = z.object({
  minutes: z.number().int().min(1).max(480),
  taskId: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  await connectDB();

  const sessions = await FocusSession.find({ userId: session.user.id })
    .sort({ startedAt: -1 })
    .limit(limit)
    .lean();

  // Compute streak: consecutive days with at least one completed session
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const checkDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dayStart = new Date(checkDate);
    const dayEnd = new Date(checkDate);
    dayEnd.setHours(23, 59, 59, 999);

    const hasSessions = sessions.some((s) => {
      const d = new Date(s.startedAt ?? "");
      return d >= dayStart && d <= dayEnd && s.endedAt;
    });

    if (hasSessions) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (i === 0) {
      // Today doesn't count yet if no session
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Weekly stats
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weeklySessions = sessions.filter((s) => new Date(s.startedAt ?? "") >= weekAgo && s.endedAt);
  const weeklyMinutes = weeklySessions.reduce((sum, s) => sum + s.minutes, 0);

  return NextResponse.json({ sessions, streak, weeklyMinutes, weeklyCount: weeklySessions.length });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });

  await connectDB();

  const focusSession = await FocusSession.create({
    userId: session.user.id,
    minutes: parsed.data.minutes,
    taskId: parsed.data.taskId,
    startedAt: new Date(),
  });

  // Update presence
  await Presence.findOneAndUpdate(
    { userId: session.user.id },
    { userId: session.user.id, focusActive: true, lastSeen: new Date() },
    { upsert: true },
  );

  await Activity.create({
    userId: session.user.id,
    type: "focus_started",
    resourceId: focusSession._id.toString(),
    resourceType: "focus_session",
    meta: { minutes: parsed.data.minutes },
  });

  return NextResponse.json({ session: focusSession }, { status: 201 });
}
