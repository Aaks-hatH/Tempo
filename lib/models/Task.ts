import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const checklistItemSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
  },
  { _id: false },
);

const taskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 255 },
    description: { type: String, trim: true },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], default: "MEDIUM" },
    status: { type: String, enum: ["TODO", "IN_PROGRESS", "REVIEW", "DONE"], default: "TODO" },
    dueAt: { type: Date },
    order: { type: Number, default: 0 },
    recurrence: { type: String, trim: true },
    tags: { type: [String], validate: [(tags: string[]) => tags.length <= 20, "A task can have at most 20 tags"] },
    checklist: { type: [checklistItemSchema], default: [] },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
  },
  { timestamps: true },
);

taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, dueAt: 1 });

export type TaskDocument = InferSchemaType<typeof taskSchema>;

const Task = (mongoose.models.Task as Model<TaskDocument>) ?? mongoose.model<TaskDocument>("Task", taskSchema);

export default Task;
