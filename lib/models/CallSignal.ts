import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * CallSignal stores WebRTC signaling messages (offers, answers, ICE candidates)
 * exchanged between peers via the API. The client polls GET /api/call/signal/[roomId]
 * for new signals addressed to it.
 *
 * TTL: signals expire after 2 minutes — they are ephemeral by design.
 * After signaling is complete, WebRTC communicates directly peer-to-peer.
 */
const callSignalSchema = new Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    // Peer ID of the sender (user session ID)
    fromPeer: {
      type: String,
      required: true,
    },
    // Peer ID of the intended recipient. null = broadcast to all in room.
    toPeer: {
      type: String,
      default: null,
    },
    // "offer" | "answer" | "ice-candidate"
    type: {
      type: String,
      required: true,
      enum: ["offer", "answer", "ice-candidate"],
    },
    // The actual SDP or ICE candidate payload — stored as-is from the browser
    data: {
      type: Schema.Types.Mixed,
      required: true,
    },
    // TTL: signals auto-delete after 2 minutes
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 2 * 60 * 1000),
      index: { expireAfterSeconds: 0 },
    },
  },
  { timestamps: true },
);

// Compound index for efficient polling queries
callSignalSchema.index({ roomId: 1, createdAt: 1 });
callSignalSchema.index({ roomId: 1, toPeer: 1, createdAt: 1 });

export type CallSignalDocument = InferSchemaType<typeof callSignalSchema>;

const CallSignal =
  (mongoose.models.CallSignal as Model<CallSignalDocument>) ??
  mongoose.model<CallSignalDocument>("CallSignal", callSignalSchema);

export default CallSignal;
