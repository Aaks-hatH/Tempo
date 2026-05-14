import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const activitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: [
        "task_created", "task_completed", "task_updated",
        "note_created", "note_updated",
        "project_created", "project_updated",
        "focus_started", "focus_completed",
        "call_started", "call_joined",
        "message_sent",
      ],
    },
    resourceId: { type: String },
    resourceType: { type: String },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

activitySchema.index({ createdAt: -1 });
activitySchema.index({ userId: 1, createdAt: -1 });

export type ActivityDocument = InferSchemaType<typeof activitySchema>;

const Activity =
  (mongoose.models.Activity as Model<ActivityDocument>) ??
  mongoose.model<ActivityDocument>("Activity", activitySchema);

export default Activity;
