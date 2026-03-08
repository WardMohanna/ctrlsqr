import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  id: string;       // a random UUID string
  name: string;
  lastname: string;
  userName: string; // typically constructed as `${name.toLowerCase()}.${lastname.toLowerCase()}`
  role: 'admin' | 'user' | 'employee'; // admin = manager with full access, user = regular user, employee = production employee
  password: string; // hashed password
}

const UserSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  lastname: { type: String, required: true },
  userName: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    required: true,
    enum: ['admin', 'user', 'employee'],
    default: 'user'
  },
  password: { type: String, required: true },
});

// Export the model. This ensures that if the model already exists (hot reload in development), it is reused.
export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
