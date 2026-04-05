import mongoose from "mongoose";

const ClientSettingsSchema = new mongoose.Schema({
  // B2B Client Fields Configuration
  visibleFields: {
    type: [String],
    default: [
      "officialEntityName",
      "taxId",
      "category",
      "city",
      "address",
      "active",
      "contacts",
      "paymentTerms",
      "creditLimit",
    ],
  },
  
  // Custom fields that admins can define globally
  availableCustomFields: {
    type: [
      {
        name: { type: String, required: true },
        description: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },

  // Fields that are mandatory for all users (cannot be hidden)
  mandatoryFields: {
    type: [String],
    default: ["officialEntityName", "taxId"],
  },

  // Default visible field configuration for new sessions/users
  defaultVisibleFields: {
    type: [String],
    default: [
      "officialEntityName",
      "taxId",
      "category",
      "city",
      "address",
      "active",
      "contacts",
      "paymentTerms",
      "creditLimit",
    ],
  },

  // Settings for categories and payment terms
  allowMultipleCategories: { type: Boolean, default: false },
  allowCustomCategories: { type: Boolean, default: true },
  allowCustomPaymentTerms: { type: Boolean, default: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.ClientSettings || mongoose.model("ClientSettings", ClientSettingsSchema);
