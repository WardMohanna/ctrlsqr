import mongoose, { Document, Schema } from "mongoose";

export interface ITenant extends Document {
  name: string;
  slug: string;
  logo?: string;
  ownerUserId?: string;
  /** Number of user seats purchased for this tenant */
  purchasedUsers: number;
  plan: "free" | "starter" | "pro" | "enterprise";
  status: "active" | "suspended" | "cancelled";
  trialEndsAt?: Date;
  maxUsers?: number;
  maxProducts?: number;
  features: {
    advancedReports: boolean;
    multiBranch: boolean;
  };
  contactEmail?: string;
  phone?: string;
  address?: {
    city?: string;
    street?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
    logo: { type: String },
    ownerUserId: { type: String },
    purchasedUsers: { type: Number, required: true, min: 1, default: 1 },
    plan: { type: String, enum: ["free", "starter", "pro", "enterprise"], default: "free" },
    status: { type: String, enum: ["active", "suspended", "cancelled"], default: "active" },
    trialEndsAt: { type: Date },
    maxUsers: { type: Number },
    maxProducts: { type: Number },
    features: {
      advancedReports: { type: Boolean, default: false },
      multiBranch: { type: Boolean, default: false },
    },
    contactEmail: { type: String },
    phone: { type: String },
    address: {
      city: { type: String },
      street: { type: String },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Tenant ||
  mongoose.model<ITenant>("Tenant", TenantSchema);
