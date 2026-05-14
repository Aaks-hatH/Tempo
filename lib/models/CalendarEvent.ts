import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const calendarEventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    color: { type: String, default: "#3B82F6" },
    description: { type: String, trim: true },
    allDay: { type: Boolean, default: false },
    source: { type: String, default: "tempo" },
    taskId: { type: Schema.Types.ObjectId, ref: "Task" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

calendarEventSchema.index({ userId: 1, startsAt: 1 });

export type CalendarEventDocument = InferSchemaType<typeof calendarEventSchema>;

const CalendarEvent =
  (mongoose.models.CalendarEvent as Model<CalendarEventDocument>) ??
  mongoose.model<CalendarEventDocument>("CalendarEvent", calendarEventSchema);

export default CalendarEvent;
