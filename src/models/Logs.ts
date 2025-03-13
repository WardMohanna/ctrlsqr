import mongoose, { Schema, Document } from "mongoose";

export interface ILog extends Document {
  userId: string;              // ID of the user who owns this log
  text: string;                // The log text
  type: string;                // e.g., "start", "normal", "end", etc.
  startTime: Date;             // When the log started
  endTime?: Date | null;       // When the log ended (if ended)
  accumulatedDuration?: number; // Total duration (ms) for this log
}

const LogSchema = new Schema<ILog>(
  {
    userId: { type: String, required: true },
    text: { type: String, required: true },
    type: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    accumulatedDuration: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// If the model is already declared (in dev/hot-reload), reuse it.
export default (mongoose.models.Log as mongoose.Model<ILog>) ||
  mongoose.model<ILog>("Log", LogSchema);
