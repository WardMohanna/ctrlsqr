import mongoose from "mongoose";

const AccountCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.AccountCategory || mongoose.model("AccountCategory", AccountCategorySchema);
