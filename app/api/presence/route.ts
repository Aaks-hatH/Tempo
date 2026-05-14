import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Presence from "@/lib/models/Presence";

const heartbeatSchema = z.object({
  currentPage: z.string().max(255).optional(),
  status: z.enum(["online", "away", "dnd"]).optional(),
  focusActive: z.boolean().optional(),
  inCall: z.boolean().optional(),
  callRoomId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = heartbeatSchema.safeParse(body);
  const data = parsed.success ? parsed.data : {};

  await connectDB();

  await Presence.findOneAndUpdate(
    { userId: session.user.id },
    { userId: session.user.id, lastSeen: new Date(), ...data },
    { upsert: true, new: true },
  );

  return NextResponse.json({ ok: true });
}
