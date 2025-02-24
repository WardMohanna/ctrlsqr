import mongoose from "mongoose";

const SupplierSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  contactName: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  taxId: { type: String, unique: true }, // 🔹 Optional: Helps with invoice validation
  paymentTerms: { type: String, enum: ['Net 5','Net 10','Net 15','Net 30', 'Net 60', 'Prepaid', 'Cash on Delivery'] }, // 🔹 Optional: Defines payment terms
}, { timestamps: true });

export default mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema);
