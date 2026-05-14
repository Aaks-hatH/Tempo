import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Task from "@/lib/models/Task";
import Activity from "@/lib/models/Activity";

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).trim().optional(),
  description: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  dueAt: z.string().datetime().nullable().optional(),
  tags: z.array(z.string().max(32)).max(20).optional(),
  order: z.number().optional(),
  checklist: z.array(z.object({ text: z.string(), done: z.boolean() })).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const task = await Task.findById(id).populate("userId", "name email avatarUrl").lean();
  if (!task) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({ task });
}

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

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await connectDB();

  const { dueAt, ...rest } = parsed.data;
  const update: Record<string, unknown> = { ...rest };
  if (dueAt !== undefined) update.dueAt = dueAt ? new Date(dueAt) : null;

  const task = await Task.findByIdAndUpdate(id, update, { new: true }).lean();
  if (!task) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (parsed.data.status === "DONE") {
    await Activity.create({
      userId: session.user.id,
      type: "task_completed",
      resourceId: id,
      resourceType: "task",
      meta: { title: (task as { title?: string }).title },
    });
  }

  return NextResponse.json({ task });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  await Task.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
