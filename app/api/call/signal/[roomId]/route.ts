import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import CallRoom from "@/lib/models/CallRoom";
import CallSignal from "@/lib/models/CallSignal";
import { z } from "zod";

const signalSchema = z.object({
  pin: z.string().regex(/^\d{6}$/),
  peerId: z.string().min(1).max(128),
  toPeer: z.string().min(1).max(128).optional(),
  type: z.enum(["offer", "answer", "ice-candidate"]),
  data: z.unknown(),
});

/**
 * Verify that the provided PIN matches the room's stored pinHash.
 * Returns the room document or null.
 */
async function verifyRoomPin(roomId: string, pin: string) {
  // Must explicitly select pinHash — it is select: false on the schema
  const room = await CallRoom.findOne({ roomId }).select("+pinHash").lean();
  if (!room) return null;
  if (room.expiresAt < new Date()) return null;

  const valid = await bcrypt.compare(pin, room.pinHash as string);
  return valid ? room : null;
}

// POST /api/call/signal/[roomId] — send a signaling message (offer/answer/ICE)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = signalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { pin, peerId, toPeer, type, data } = parsed.data;

  await connectDB();

  const room = await verifyRoomPin(roomId, pin);
  if (!room) {
    // Use a generic message to avoid leaking whether the room exists
    return NextResponse.json({ message: "Invalid room or PIN" }, { status: 403 });
  }

  await CallSignal.create({
    roomId,
    fromPeer: peerId,
    toPeer: toPeer ?? null,
    type,
    data,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

// GET /api/call/signal/[roomId]?since=ISO&peerId=XXX&pin=NNNNNN
// Poll for signals addressed to this peer since a given timestamp.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { roomId } = await params;
  const url = new URL(request.url);
  const pin = url.searchParams.get("pin") ?? "";
  const peerId = url.searchParams.get("peerId") ?? "";
  const since = url.searchParams.get("since");

  if (!pin || !peerId) {
    return NextResponse.json({ message: "Missing pin or peerId" }, { status: 400 });
  }

  await connectDB();

  const room = await verifyRoomPin(roomId, pin);
  if (!room) {
    return NextResponse.json({ message: "Invalid room or PIN" }, { status: 403 });
  }

  const sinceDate = since ? new Date(since) : new Date(Date.now() - 60_000);

  // Fetch signals addressed to this peer or broadcast (toPeer: null)
  const signals = await CallSignal.find({
    roomId,
    fromPeer: { $ne: peerId }, // don't return own signals
    $or: [{ toPeer: peerId }, { toPeer: null }],
    createdAt: { $gt: sinceDate },
  })
    .sort({ createdAt: 1 })
    .limit(50)
    .lean();

  return NextResponse.json({ signals, serverTime: new Date().toISOString() });
}
