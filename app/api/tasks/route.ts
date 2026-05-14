import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Task from "@/lib/models/Task";
import Activity from "@/lib/models/Activity";

const createTaskSchema = z.object({
  title: z.string().min(1).max(255).trim(),
  description: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z.enum(["TODO", "IN_PROGRESS", "REVIEW", "DONE"]).default("TODO"),
  dueAt: z.string().datetime().optional().nullable(),
  tags: z.array(z.string().max(32)).max(20).default([]),
  projectId: z.string().optional(),
  assignedTo: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const projectId = searchParams.get("projectId");
  const search = searchParams.get("search");
  const all = searchParams.get("all") === "true"; // team tasks

  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = all
    ? {} // all team tasks
    : { userId: session.user.id };

  if (status) query.status = status;
  if (projectId) query.projectId = projectId;
  if (search) query.title = { $regex: search, $options: "i" };

  const tasks = await Task.find(query)
    .sort({ order: 1, createdAt: -1 })
    .limit(200)
    .populate("userId", "name email avatarUrl")
    .populate("assignedTo", "name email avatarUrl")
    .populate("projectId", "name color")
    .lean();

  return NextResponse.json({ tasks });
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

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await connectDB();

  const { dueAt, ...rest } = parsed.data;

  const task = await Task.create({
    ...rest,
    dueAt: dueAt ? new Date(dueAt) : undefined,
    userId: session.user.id,
  });

  // Log activity
  await Activity.create({
    userId: session.user.id,
    type: "task_created",
    resourceId: task._id.toString(),
    resourceType: "task",
    meta: { title: task.title },
  });

  return NextResponse.json({ task }, { status: 201 });
}
