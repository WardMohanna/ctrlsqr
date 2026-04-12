import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  id: string;        // a random UUID string
  name: string;
  lastname: string;
  userName: string;  // typically constructed as `${name.toLowerCase()}.${lastname.toLowerCase()}`
  /**
   * admin      – per-tenant manager with full access to that tenant
   * user       – regular user within a tenant
   * employee   – production employee within a tenant
   * super_admin – cross-tenant; not bound to any tenantId
   */
  role: "admin" | "user" | "employee" | "super_admin";
  password: string;  // hashed password
  tenantId?: string; // undefined / null for super_admin; required for all other roles
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
  tenantId: { type: String, default: null, index: true },
});

// Export the model. This ensures that if the model already exists (hot reload in development), it is reused.
export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
