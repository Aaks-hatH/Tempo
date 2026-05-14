import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Activity from "@/lib/models/Activity";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 100);
  const since = searchParams.get("since");

  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};
  if (since) query.createdAt = { $gt: new Date(since) };

  const activities = await Activity.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("userId", "name email avatarUrl")
    .lean();

  return NextResponse.json({ activities, serverTime: new Date().toISOString() });
}
