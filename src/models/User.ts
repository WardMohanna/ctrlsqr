import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  id: string;
  name: string;
  lastname: string;
  userName: string;
  role: "admin" | "user" | "employee" | "super_admin";
  password: string;
  hourPrice?: number;
  tenantId?: string;
}

const UserSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  lastname: { type: String, required: true },
  userName: { type: String, required: true, unique: true },
  role: {
    type: String,
    required: true,
    enum: ["admin", "user", "employee", "super_admin"],
    default: "user",
  },
  password: { type: String, required: true },
  hourPrice: { type: Number, default: 0 },
  tenantId: { type: String, default: null, index: true },
});

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
