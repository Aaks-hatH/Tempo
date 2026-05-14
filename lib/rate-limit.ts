import { connectDB } from "@/lib/mongodb";
import RateLimitModel from "@/lib/models/RateLimit";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
}

/**
 * Fixed-window rate limiter backed by MongoDB.
 *
 * Uses a single atomic findOneAndUpdate with an aggregation-pipeline
 * update to avoid race conditions — safe under concurrent serverless
 * invocations without transactions.
 *
 * @param key       Unique bucket key, e.g. "register:1.2.3.4"
 * @param max       Max requests allowed in the window
 * @param windowMs  Window duration in milliseconds
 */
export async function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<RateLimitResult> {
  await connectDB();

  const now = new Date();
  const futureReset = new Date(now.getTime() + windowMs);

  // Atomic pipeline update:
  //  - If the existing window is still active  → increment count, keep resetAt
  //  - If the window has expired (or no doc)   → reset count to 1, set new resetAt
  const doc = await RateLimitModel.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          count: {
            $cond: {
              if: { $gt: ["$resetAt", now] },
              then: { $add: ["$count", 1] },
              else: 1,
            },
          },
          resetAt: {
            $cond: {
              if: { $gt: ["$resetAt", now] },
              then: "$resetAt",
              else: futureReset,
            },
          },
        },
      },
    ],
    { upsert: true, new: true },
  );

  const remaining = Math.max(0, max - doc.count);
  const retryAfterSeconds = Math.ceil(
    (doc.resetAt.getTime() - now.getTime()) / 1000,
  );

  return {
    success: doc.count <= max,
    remaining,
    resetAt: doc.resetAt,
    retryAfterSeconds,
  };
}

/**
 * Extract the real client IP from Vercel / reverse-proxy headers.
 * Falls back to "unknown" — never throws.
 */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    // Vercel sets x-real-ip; generic proxies set x-forwarded-for
    const real = h.get("x-real-ip");
    if (real) return real.trim();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
  } catch {
    // headers() can throw outside a request context in tests
  }
  return "unknown";
}

/**
 * Convenience: run a rate-limit check and immediately return a 429
 * NextResponse with Retry-After if the limit is exceeded.
 * Returns null if the request is within limits.
 */
export async function enforceRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<NextResponse | null> {
  const result = await rateLimit(key, max, windowMs);

  if (!result.success) {
    return NextResponse.json(
      { message: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Limit": String(max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(result.resetAt.getTime() / 1000)),
        },
      },
    );
  }

  return null;
}
