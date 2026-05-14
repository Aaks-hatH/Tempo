import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * RateLimit — MongoDB-backed fixed-window rate limiter.
 *
 * Each document represents one rate-limit bucket (key = action:identifier).
 * The TTL index on `resetAt` auto-purges expired buckets so the collection
 * stays lean with zero manual cleanup.
 *
 * Atomicity: findOneAndUpdate with an aggregation-pipeline update handles
 * the window-reset logic in a single round-trip — no lost-update race.
 */
const rateLimitSchema = new Schema(
  {
    // e.g. "register:203.0.113.5" or "login:user@example.com"
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    count: {
      type: Number,
      required: true,
      default: 1,
    },
    // When this window expires — TTL index deletes the doc automatically
    resetAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: false, versionKey: false },
);

export type RateLimitDocument = InferSchemaType<typeof rateLimitSchema>;

const RateLimitModel =
  (mongoose.models.RateLimit as Model<RateLimitDocument>) ??
  mongoose.model<RateLimitDocument>("RateLimit", rateLimitSchema);

export default RateLimitModel;
