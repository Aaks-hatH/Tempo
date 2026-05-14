import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";

const updateSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(128).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  await connectDB();
  const user = await User.findById(session.user.id, { password: 0 }).lean();
  if (!user) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({ user });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });

  await connectDB();

  const update: Record<string, unknown> = {};
  if (parsed.data.name) update.name = parsed.data.name;
  if (parsed.data.avatarUrl !== undefined) update.avatarUrl = parsed.data.avatarUrl;

  if (parsed.data.newPassword) {
    if (!parsed.data.currentPassword) {
      return NextResponse.json({ message: "Current password required" }, { status: 400 });
    }
    const user = await User.findById(session.user.id).select("+password");
    if (!user?.password) return NextResponse.json({ message: "Error" }, { status: 500 });

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!valid) return NextResponse.json({ message: "Current password is incorrect" }, { status: 400 });

    update.password = await bcrypt.hash(parsed.data.newPassword, 12);
  }

  const user = await User.findByIdAndUpdate(session.user.id, update, { new: true, projection: { password: 0 } }).lean();
  return NextResponse.json({ user });
}
