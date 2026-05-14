import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

/**
 * Call at the top of any admin API route handler.
 *
 * Returns `null` when the caller is an authenticated admin.
 * Returns a 401 or 403 `NextResponse` when they are not — the caller should
 * return that response immediately.
 *
 * @example
 * export async function GET() {
 *   const denied = await requireAdmin();
 *   if (denied) return denied;
 *   // ... admin logic
 * }
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  return null;
}
