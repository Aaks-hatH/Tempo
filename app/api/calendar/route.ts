import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import CalendarEvent from "@/lib/models/CalendarEvent";

const createEventSchema = z.object({
  title: z.string().min(1).max(255).trim(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  color: z.string().optional().default("#3B82F6"),
  description: z.string().max(1000).optional(),
  allDay: z.boolean().optional().default(false),
  shared: z.boolean().optional().default(false),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const all = searchParams.get("all") === "true";

  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = all ? {} : { userId: session.user.id };

  if (from) query.startsAt = { ...query.startsAt, $gte: new Date(from) };
  if (to) query.startsAt = { ...query.startsAt, $lte: new Date(to) };

  const events = await CalendarEvent.find(query)
    .sort({ startsAt: 1 })
    .limit(200)
    .populate("userId", "name email avatarUrl")
    .lean();

  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await connectDB();

  const event = await CalendarEvent.create({
    ...parsed.data,
    startsAt: new Date(parsed.data.startsAt),
    endsAt: new Date(parsed.data.endsAt),
    userId: session.user.id,
  });

  return NextResponse.json({ event }, { status: 201 });
}
