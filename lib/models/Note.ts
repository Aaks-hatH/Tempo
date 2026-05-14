import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const noteSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 255 },
    content: { type: String, default: "" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    tags: { type: [String], default: [] },
    pinned: { type: Boolean, default: false },
    color: { type: String, default: "#3B82F6" },
  },
  { timestamps: true },
);

noteSchema.index({ userId: 1, updatedAt: -1 });
noteSchema.index({ title: "text", content: "text" });

export type NoteDocument = InferSchemaType<typeof noteSchema>;

const Note =
  (mongoose.models.Note as Model<NoteDocument>) ??
  mongoose.model<NoteDocument>("Note", noteSchema);

export default Note;
