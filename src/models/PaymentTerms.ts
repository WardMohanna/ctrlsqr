import mongoose from "mongoose";

const PaymentTermsSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  days: { type: Number, required: true }, // e.g., Net 30 = 30 days
  description: { type: String },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.PaymentTerms || mongoose.model("PaymentTerms", PaymentTermsSchema);
