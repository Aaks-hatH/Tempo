import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Note from "@/lib/models/Note";

const updateSchema = z.object({
  title: z.string().min(1).max(255).trim().optional(),
  content: z.string().max(100000).optional(),
  tags: z.array(z.string().max(32)).max(20).optional(),
  pinned: z.boolean().optional(),
  color: z.string().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  const note = await Note.findOne({ _id: id, userId: session.user.id }).lean();
  if (!note) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({ note });
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

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ errors: parsed.error.flatten().fieldErrors }, { status: 400 });

  await connectDB();

  const note = await Note.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    parsed.data,
    { new: true },
  ).lean();

  if (!note) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json({ note });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await connectDB();

  await Note.findOneAndDelete({ _id: id, userId: session.user.id });
  return NextResponse.json({ success: true });
}
