import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import Presence from "@/lib/models/Presence";
import { requireAdmin } from "@/lib/require-admin";

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// Returns all users with role, join date, and online status.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  await connectDB();

  const users = await User.find({})
    .select("_id name email role createdAt")
    .sort({ createdAt: -1 })
    .lean();

  // Fetch presence for online status (last seen within 5 min)
  const threshold = new Date(Date.now() - 5 * 60 * 1000);
  const presences = await Presence.find({ lastSeen: { $gte: threshold } })
    .select("userId")
    .lean();
  const onlineIds = new Set(presences.map((p) => p.userId.toString()));

  const result = users.map((u) => ({
    _id: u._id.toString(),
    name: u.name ?? null,
    email: u.email,
    role: u.role ?? "member",
    isOnline: onlineIds.has(u._id.toString()),
    joinedAt: (u as unknown as { createdAt: Date }).createdAt,
  }));

  return NextResponse.json({ users: result });
}

// ─── PATCH /api/admin/users ───────────────────────────────────────────────────
// Body: { userId, action: "setRole", role: "admin" | "member" | "guest" }
//     | { userId, action: "deactivate" }
export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = (await request.json()) as {
    userId?: string;
    action?: string;
    role?: string;
  };

  const { userId, action } = body;
  if (!userId || !action) {
    return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
  }

  await connectDB();

  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (action === "setRole") {
    const role = body.role;
    if (!["admin", "member", "guest"].includes(role ?? "")) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    user.role = role as "admin" | "member" | "guest";
    await user.save();
    return NextResponse.json({ success: true, user: { _id: userId, role: user.role } });
  }

  if (action === "deactivate") {
    // We set role to "guest" as a lightweight "deactivated" state.
    // A full implementation would add an `active: false` field to the schema;
    // for now this is consistent with the existing role model.
    user.role = "guest";
    await user.save();
    return NextResponse.json({ success: true, user: { _id: userId, role: "guest" } });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
