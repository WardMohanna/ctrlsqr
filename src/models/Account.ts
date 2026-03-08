import mongoose from "mongoose";

const AccountContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
});

const AccountSchema = new mongoose.Schema({
  // General Information
  officialEntityName: { type: String, required: true },
  taxId: { type: String, required: true, unique: true },
  category: { type: String, required: true }, // References to AccountCategory
  city: { type: String },
  address: { type: String },
  active: { type: Boolean, default: true },

  // Contacts: Support up to 3 contacts
  contacts: [AccountContactSchema],

  // Payment Information
  paymentTerms: { type: String }, // References to PaymentTerms
  creditLimit: { type: Number },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.Account || mongoose.model("Account", AccountSchema);
