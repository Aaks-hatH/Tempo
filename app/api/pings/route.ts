import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Ping from "@/lib/models/Ping";

const createPingSchema = z.object({
  toUserId: z.string().min(1),
  type: z.enum(["ping", "assign", "mention", "request"]).default("ping"),
  message: z.string().max(500).optional(),
  taskId: z.string().optional(),
  taskTitle: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") === "true";

  await connectDB();

  const query: Record<string, unknown> = {
    toUserId: session.user.id,
    dismissed: false,
  };
  if (unreadOnly) query.read = false;

  const pings = await Ping.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("fromUserId", "name email avatarUrl")
    .populate("taskId", "title status priority")
    .lean();

  const unreadCount = await Ping.countDocuments({
    toUserId: session.user.id,
    read: false,
    dismissed: false,
  });

  return NextResponse.json({ pings, unreadCount });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createPingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });

  if (parsed.data.toUserId === session.user.id) {
    return NextResponse.json({ message: "Cannot ping yourself" }, { status: 400 });
  }

  await connectDB();

  const ping = await Ping.create({
    fromUserId: session.user.id,
    ...parsed.data,
  });

  const populated = await ping.populate("fromUserId", "name email avatarUrl");

  return NextResponse.json({ ping: populated }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  await connectDB();

  if (action === "read-all") {
    await Ping.updateMany({ toUserId: session.user.id, read: false }, { read: true });
    return NextResponse.json({ ok: true });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const { pingId, read, dismissed } = body as { pingId?: string; read?: boolean; dismissed?: boolean };
  if (!pingId) return NextResponse.json({ message: "pingId required" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (read !== undefined) update.read = read;
  if (dismissed !== undefined) update.dismissed = dismissed;

  await Ping.findOneAndUpdate({ _id: pingId, toUserId: session.user.id }, update);

  return NextResponse.json({ ok: true });
}
