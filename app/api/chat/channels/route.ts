import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Channel from "@/lib/models/Channel";

const createSchema = z.object({
  name: z.string().min(1).max(64).trim().toLowerCase().transform((s) => s.replace(/\s+/g, "-")),
  description: z.string().max(255).optional(),
  type: z.enum(["public", "dm"]).default("public"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();

  // Seed default channels if none exist
  const count = await Channel.countDocuments();
  if (count === 0) {
    await Channel.insertMany([
      { name: "general", description: "General team discussion", type: "public", members: [], createdBy: session.user.id },
      { name: "dev", description: "Engineering and code", type: "public", members: [], createdBy: session.user.id },
      { name: "random", description: "Off-topic, fun stuff", type: "public", members: [], createdBy: session.user.id },
    ]);
  }

  const channels = await Channel.find({ type: "public" }).sort({ createdAt: 1 }).lean();

  return NextResponse.json({ channels });
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

  const existing = await Channel.findOne({ name: parsed.data.name });
  if (existing) return NextResponse.json({ message: "Channel already exists" }, { status: 409 });

  const channel = await Channel.create({ ...parsed.data, createdBy: session.user.id });
  return NextResponse.json({ channel }, { status: 201 });
}
