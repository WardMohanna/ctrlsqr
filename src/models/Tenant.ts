import mongoose, { Document, Schema } from "mongoose";

export interface ITenant extends Document {
  name: string;
  /** Number of user seats purchased for this tenant */
  purchasedUsers: number;
  isActive: boolean;
  createdAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    purchasedUsers: { type: Number, required: true, min: 1, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Tenant ||
  mongoose.model<ITenant>("Tenant", TenantSchema);
