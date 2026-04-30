import mongoose from "mongoose";

export const epicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

epicSchema.index({ active: 1, title: 1 });

export default mongoose.models.Epic || mongoose.model("Epic", epicSchema);
