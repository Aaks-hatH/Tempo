import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Project from "@/lib/models/Project";
import Task from "@/lib/models/Task";
import Activity from "@/lib/models/Activity";

const createProjectSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{3,6}$/).default("#3B82F6"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const projects = await Project.find({}).sort({ createdAt: -1 }).limit(50).lean();

  // Get task counts per project
  const projectIds = projects.map((p) => p._id);
  const taskCounts = await Task.aggregate([
    { $match: { projectId: { $in: projectIds } } },
    { $group: { _id: "$projectId", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "DONE"] }, 1, 0] } } } },
  ]);

  const countMap = new Map(taskCounts.map((t) => [t._id.toString(), t]));

  const enriched = projects.map((p) => {
    const counts = countMap.get(p._id.toString());
    const total = counts?.total ?? 0;
    const done = counts?.done ?? 0;
    return {
      ...p,
      taskCount: total,
      completedCount: done,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  return NextResponse.json({ projects: enriched });
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

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await connectDB();

  const project = await Project.create(parsed.data);

  await Activity.create({
    userId: session.user.id,
    type: "project_created",
    resourceId: project._id.toString(),
    resourceType: "project",
    meta: { name: project.name },
  });

  return NextResponse.json({ project }, { status: 201 });
}
