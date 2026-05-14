import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const milestoneSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    dueAt: { type: Date },
    completed: { type: Boolean, default: false },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  },
  { timestamps: true },
);

export type MilestoneDocument = InferSchemaType<typeof milestoneSchema>;

const Milestone =
  (mongoose.models.Milestone as Model<MilestoneDocument>) ??
  mongoose.model<MilestoneDocument>("Milestone", milestoneSchema);

export default Milestone;
