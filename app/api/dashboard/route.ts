import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Task from "@/lib/models/Task";
import FocusSession from "@/lib/models/FocusSession";
import Project from "@/lib/models/Project";
import CalendarEvent from "@/lib/models/CalendarEvent";
import Activity from "@/lib/models/Activity";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const [myTasks, teamTasks, projects, todayEvents, recentActivity, focusSessions] = await Promise.all([
    Task.find({ userId: session.user.id }).lean(),
    Task.find({ status: { $ne: "DONE" } }).lean(),
    Project.find({}).lean(),
    CalendarEvent.find({ startsAt: { $gte: todayStart, $lte: todayEnd } })
      .populate("userId", "name")
      .lean(),
    Activity.find({ createdAt: { $gte: weekStart } })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "name email avatarUrl")
      .lean(),
    FocusSession.find({ userId: session.user.id, startedAt: { $gte: weekStart } }).lean(),
  ]);

  const myTasksByStatus = {
    todo: myTasks.filter((t) => t.status === "TODO").length,
    inProgress: myTasks.filter((t) => t.status === "IN_PROGRESS").length,
    review: myTasks.filter((t) => t.status === "REVIEW").length,
    done: myTasks.filter((t) => t.status === "DONE").length,
  };

  const overdueCount = myTasks.filter(
    (t) => t.dueAt && new Date(t.dueAt) < now && t.status !== "DONE",
  ).length;

  const urgentTasks = myTasks
    .filter((t) => t.priority === "URGENT" && t.status !== "DONE")
    .slice(0, 5);

  const focusMinutesThisWeek = focusSessions.reduce((sum, s) => sum + s.minutes, 0);

  const dailyFocus = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(now);
    day.setDate(day.getDate() - (6 - i));
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const minutes = focusSessions
      .filter((s) => {
        const d = new Date(s.startedAt ?? "");
        return d >= day && d <= dayEnd;
      })
      .reduce((sum, s) => sum + s.minutes, 0);
    return { day: day.toLocaleDateString("en-US", { weekday: "short" }), minutes };
  });

  return NextResponse.json({
    myTasksByStatus,
    overdueCount,
    urgentTasks,
    teamTaskCount: teamTasks.length,
    projectCount: projects.length,
    todayEvents,
    recentActivity,
    focusMinutesThisWeek,
    dailyFocus,
  });
}
