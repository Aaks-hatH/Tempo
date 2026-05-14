import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import ChatMessage from "@/lib/models/ChatMessage";
import Activity from "@/lib/models/Activity";

const createSchema = z.object({
  channelId: z.string().min(1),
  content: z.string().min(1).max(4000).trim(),
  replyTo: z.string().optional(),
});

const updateSchema = z.object({
  content: z.string().min(1).max(4000).trim(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");
  const since = searchParams.get("since");
  const before = searchParams.get("before");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

  if (!channelId) return NextResponse.json({ message: "channelId required" }, { status: 400 });

  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = { channelId, deleted: { $ne: true } };
  if (since) query.createdAt = { $gt: new Date(since) };
  if (before) query.createdAt = { ...(query.createdAt ?? {}), $lt: new Date(before) };

  const messages = await ChatMessage.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("userId", "name email avatarUrl")
    .lean();

  return NextResponse.json({ messages: messages.reverse(), serverTime: new Date().toISOString() });
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

  const message = await ChatMessage.create({
    ...parsed.data,
    userId: session.user.id,
  });

  const populated = await ChatMessage.findById(message._id)
    .populate("userId", "name email avatarUrl")
    .lean();

  await Activity.create({
    userId: session.user.id,
    type: "message_sent",
    resourceId: message._id.toString(),
    resourceType: "message",
    meta: { channelId: parsed.data.channelId },
  });

  return NextResponse.json({ message: populated }, { status: 201 });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });

  await connectDB();

  const message = await ChatMessage.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { content: parsed.data.content, edited: true },
    { new: true },
  ).populate("userId", "name email avatarUrl").lean();

  if (!message) return NextResponse.json({ message: "Not found or unauthorized" }, { status: 404 });

  return NextResponse.json({ message });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });

  await connectDB();

  await ChatMessage.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { deleted: true, content: "[deleted]" },
  );

  return NextResponse.json({ success: true });
}
