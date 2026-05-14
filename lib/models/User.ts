import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,    // unique: true implicitly creates an index on this field.
      lowercase: true, // The explicit userSchema.index({ email: 1 }) below was
      trim: true,      // a duplicate, causing Mongoose to warn every cold start.
      match: emailRegex,
    },
    name: { type: String, trim: true },
    password: { type: String, select: false },
    avatarUrl: { type: String },
    onboardingDone: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ["admin", "member", "guest"],
      default: "member",
    },
  },
  { timestamps: true },
);

// Removed duplicate: userSchema.index({ email: 1 })

export type UserDocument = InferSchemaType<typeof userSchema>;

const User =
  (mongoose.models.User as Model<UserDocument>) ??
  mongoose.model<UserDocument>("User", userSchema);

export default User;
