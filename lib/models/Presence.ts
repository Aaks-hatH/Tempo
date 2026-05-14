import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const presenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    lastSeen: { type: Date, default: Date.now },
    status: { type: String, enum: ["online", "away", "dnd", "offline"], default: "online" },
    currentPage: { type: String, default: "/" },
    focusActive: { type: Boolean, default: false },
    inCall: { type: Boolean, default: false },
    callRoomId: { type: String },
  },
  { timestamps: true },
);

export type PresenceDocument = InferSchemaType<typeof presenceSchema>;

const Presence =
  (mongoose.models.Presence as Model<PresenceDocument>) ??
  mongoose.model<PresenceDocument>("Presence", presenceSchema);

export default Presence;
