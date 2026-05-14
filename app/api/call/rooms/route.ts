import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import CallRoom from "@/lib/models/CallRoom";
import { z } from "zod";

const createRoomSchema = z.object({
  name: z.string().min(1).max(64).trim(),
  // PIN: exactly 6 digits
  pin: z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits"),
});

// GET /api/call/rooms — list active call rooms (no pinHash returned)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const rooms = await CallRoom.find(
    { expiresAt: { $gt: new Date() } },
    { pinHash: 0 }, // explicitly exclude pinHash from response
  )
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return NextResponse.json({ rooms });
}

// POST /api/call/rooms — create a new call room
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

  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, pin } = parsed.data;

  // Hash the PIN — never store it plaintext
  const pinHash = await bcrypt.hash(pin, 12);

  // Cryptographically random room ID
  const roomId = crypto.randomUUID();

  // Rooms expire in 8 hours
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

  await connectDB();

  await CallRoom.create({
    roomId,
    name,
    pinHash,
    createdBy: session.user.id,
    expiresAt,
  });

  return NextResponse.json({ roomId, name }, { status: 201 });
}
