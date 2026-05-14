import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const focusSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    taskId: { type: Schema.Types.ObjectId, ref: "Task" },
    minutes: { type: Number, required: true, min: 1, max: 480 },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true },
);

focusSessionSchema.index({ userId: 1, startedAt: -1 });

export type FocusSessionDocument = InferSchemaType<typeof focusSessionSchema>;

const FocusSession =
  (mongoose.models.FocusSession as Model<FocusSessionDocument>) ??
  mongoose.model<FocusSessionDocument>("FocusSession", focusSessionSchema);

export default FocusSession;
