import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Note from "@/lib/models/Note";
import Activity from "@/lib/models/Activity";

const createSchema = z.object({
  title: z.string().min(1).max(255).trim(),
  content: z.string().max(100000).default(""),
  tags: z.array(z.string().max(32)).max(20).default([]),
  projectId: z.string().optional(),
  color: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const projectId = searchParams.get("projectId");

  await connectDB();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = { userId: session.user.id };
  if (search) query.$or = [
    { title: { $regex: search, $options: "i" } },
    { content: { $regex: search, $options: "i" } },
  ];
  if (projectId) query.projectId = projectId;

  const notes = await Note.find(query)
    .sort({ pinned: -1, updatedAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({ notes });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });

  await connectDB();

  const note = await Note.create({ ...parsed.data, userId: session.user.id });

  await Activity.create({
    userId: session.user.id,
    type: "note_created",
    resourceId: note._id.toString(),
    resourceType: "note",
    meta: { title: note.title },
  });

  return NextResponse.json({ note }, { status: 201 });
}
