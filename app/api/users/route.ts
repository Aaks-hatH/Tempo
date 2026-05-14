import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import Presence from "@/lib/models/Presence";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  const users = await User.find({}, { password: 0 }).sort({ name: 1 }).lean();

  // Get presence for all users
  const presences = await Presence.find({
    userId: { $in: users.map((u) => u._id) },
  }).lean();

  const presenceMap = new Map(presences.map((p) => [p.userId.toString(), p]));
  const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  const enriched = users.map((u) => {
    const presence = presenceMap.get(u._id.toString());
    const lastSeen = presence?.lastSeen ? new Date(presence.lastSeen) : null;
    const isOnline = lastSeen ? Date.now() - lastSeen.getTime() < ONLINE_THRESHOLD : false;

    return {
      ...u,
      isOnline,
      status: isOnline ? (presence?.status ?? "online") : "offline",
      focusActive: presence?.focusActive ?? false,
      inCall: presence?.inCall ?? false,
      callRoomId: presence?.callRoomId,
      lastSeen: lastSeen?.toISOString(),
    };
  });

  return NextResponse.json({ users: enriched });
}
