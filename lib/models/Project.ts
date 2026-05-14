import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const hexColorRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

const projectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    color: { type: String, match: hexColorRegex, default: "#3B82F6" },
  },
  { timestamps: true },
);

export type ProjectDocument = InferSchemaType<typeof projectSchema>;

const Project = (mongoose.models.Project as Model<ProjectDocument>) ?? mongoose.model<ProjectDocument>("Project", projectSchema);

export default Project;
