import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import CalendarEvent from "@/lib/models/CalendarEvent";

const updateSchema = z.object({
  title: z.string().min(1).max(255).trim().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  color: z.string().optional(),
  description: z.string().max(1000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });

  await connectDB();

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startsAt) update.startsAt = new Date(parsed.data.startsAt);
  if (parsed.data.endsAt) update.endsAt = new Date(parsed.data.endsAt);

  const event = await CalendarEvent.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!event) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({ event });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();
  await CalendarEvent.findByIdAndDelete(id);

  return NextResponse.json({ success: true });
}
