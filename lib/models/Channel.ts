import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const channelSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 64 },
    description: { type: String, trim: true, maxlength: 255 },
    type: { type: String, enum: ["public", "dm"], default: "public" },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export type ChannelDocument = InferSchemaType<typeof channelSchema>;

const Channel =
  (mongoose.models.Channel as Model<ChannelDocument>) ??
  mongoose.model<ChannelDocument>("Channel", channelSchema);

export default Channel;
