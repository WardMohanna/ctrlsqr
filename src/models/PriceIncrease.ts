import mongoose from "mongoose";

export const PriceIncreaseSchema = new mongoose.Schema(
  {
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true,
    },
    itemName: { type: String, required: true },
    sku: { type: String, required: true },
    previousCost: { type: Number, required: true },
    newCost: { type: Number, required: true },
    changePercent: { type: Number, required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    documentId: { type: String },    // invoice officialDocId
    supplierName: { type: String, default: "Unknown" },
    receivedDate: { type: Date },
    acknowledged: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.PriceIncrease ||
  mongoose.model("PriceIncrease", PriceIncreaseSchema);
