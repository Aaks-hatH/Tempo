import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const pingSchema = new Schema(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["ping", "assign", "mention", "request"],
      default: "ping",
    },
    message: { type: String, trim: true, maxlength: 500 },
    taskId: { type: Schema.Types.ObjectId, ref: "Task" },
    taskTitle: { type: String, trim: true },
    read: { type: Boolean, default: false },
    dismissed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

pingSchema.index({ toUserId: 1, read: 1 });
pingSchema.index({ toUserId: 1, createdAt: -1 });

export type PingDocument = InferSchemaType<typeof pingSchema>;

const Ping =
  (mongoose.models.Ping as Model<PingDocument>) ??
  mongoose.model<PingDocument>("Ping", pingSchema);

export default Ping;
