import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  userId: string;
  userName: string;
  role: string;
  path: string;
  action: string;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: String, required: true },
    userName: { type: String, default: "" },
    role: { type: String, default: "user" },
    path: { type: String, required: true },
    action: { type: String, default: "page_visit" },
  },
  { timestamps: true },
);

export default (mongoose.models.AuditLog as mongoose.Model<IAuditLog>) ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
