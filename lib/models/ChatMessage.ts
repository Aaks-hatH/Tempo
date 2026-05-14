import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const reactionSchema = new Schema(
  {
    emoji: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: false },
);

const chatMessageSchema = new Schema(
  {
    channelId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 4000 },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    reactions: { type: [reactionSchema], default: [] },
    replyTo: { type: Schema.Types.ObjectId, ref: "ChatMessage" },
    attachments: { type: [String], default: [] },
  },
  { timestamps: true },
);

chatMessageSchema.index({ channelId: 1, createdAt: -1 });

export type ChatMessageDocument = InferSchemaType<typeof chatMessageSchema>;

const ChatMessage =
  (mongoose.models.ChatMessage as Model<ChatMessageDocument>) ??
  mongoose.model<ChatMessageDocument>("ChatMessage", chatMessageSchema);

export default ChatMessage;
