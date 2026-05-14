import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const callRoomSchema = new Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
    },
    // bcrypt hash of the PIN — never stored in plaintext
    pinHash: {
      type: String,
      required: true,
      select: false, // never returned in queries by default
    },
    createdBy: {
      type: String, // user ID from session
      required: true,
    },
    // Soft participant list (best-effort; WebRTC state is authoritative)
    participants: {
      type: [String],
      default: [],
    },
    // TTL index — rooms auto-expire after 8 hours of inactivity
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true },
);

export type CallRoomDocument = InferSchemaType<typeof callRoomSchema>;

const CallRoom =
  (mongoose.models.CallRoom as Model<CallRoomDocument>) ??
  mongoose.model<CallRoomDocument>("CallRoom", callRoomSchema);

export default CallRoom;
