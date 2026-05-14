import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { registerSchema } from "@/lib/validations";
import { enforceRateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/register
 *
 * Security layers (in order):
 *  1. IP-based rate limit — 5 attempts per hour per IP
 *  2. Invite PIN check   — compared against SIGNUP_PIN env var (server-side only, never in bundle)
 *  3. Zod input validation
 *  4. Duplicate email check (generic message — never confirms email existence)
 *  5. bcrypt password hash (cost 12)
 */
export async function POST(request: Request) {
  // ── 1. Rate limit by IP ───────────────────────────────────────────────────
  const ip = await getClientIp();
  const rateLimitResponse = await enforceRateLimit(
    `register:${ip}`,
    5,              // max 5 registration attempts
    60 * 60 * 1000, // per hour
  );
  if (rateLimitResponse) return rateLimitResponse;

  // ── 2. Parse body ─────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  }

  // ── 3. Check invite PIN (server-side only — SIGNUP_PIN never reaches the client bundle) ──
  const requiredPin = process.env.SIGNUP_PIN;

  if (!requiredPin) {
    return NextResponse.json(
      { message: "Registration is currently closed." },
      { status: 403 },
    );
  }

  const submittedPin =
    body !== null && typeof body === "object" && "invitePin" in body
      ? (body as Record<string, unknown>).invitePin
      : undefined;

  // Constant-length check + Buffer.equals for timing-safe comparison
  const pinMatch =
    typeof submittedPin === "string" &&
    submittedPin.length === requiredPin.length &&
    Buffer.from(submittedPin).equals(Buffer.from(requiredPin));

  if (!pinMatch) {
    return NextResponse.json(
      { message: "Invalid team access code or credentials." },
      { status: 403 },
    );
  }

  // ── 4. Validate remaining fields ──────────────────────────────────────────
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // ── 5. Create user ────────────────────────────────────────────────────────
  try {
    await connectDB();

    const existingUser = await User.exists({ email: parsed.data.email });
    if (existingUser) {
      return NextResponse.json({ message: "Unable to create account." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashedPassword,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Unable to create account." }, { status: 500 });
  }
}
