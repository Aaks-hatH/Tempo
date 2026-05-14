import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const projectMemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    role: { type: String, enum: ["owner", "admin", "member"], default: "member" },
  },
  { timestamps: true },
);

projectMemberSchema.index({ userId: 1, projectId: 1 }, { unique: true });

export type ProjectMemberDocument = InferSchemaType<typeof projectMemberSchema>;

const ProjectMember =
  (mongoose.models.ProjectMember as Model<ProjectMemberDocument>) ??
  mongoose.model<ProjectMemberDocument>("ProjectMember", projectMemberSchema);

export default ProjectMember;
