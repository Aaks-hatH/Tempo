import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import FocusSession from "@/lib/models/FocusSession";
import Activity from "@/lib/models/Activity";
import Presence from "@/lib/models/Presence";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const focusSession = await FocusSession.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { endedAt: new Date() },
    { new: true },
  ).lean();

  if (!focusSession) return NextResponse.json({ message: "Not found" }, { status: 404 });

  // Update presence
  await Presence.findOneAndUpdate(
    { userId: session.user.id },
    { focusActive: false, lastSeen: new Date() },
    { upsert: true },
  );

  await Activity.create({
    userId: session.user.id,
    type: "focus_completed",
    resourceId: id,
    resourceType: "focus_session",
    meta: { minutes: focusSession.minutes },
  });

  return NextResponse.json({ session: focusSession });
}
