import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
  documentId: { type: String, required: true },
  filePath: { type: String},
  date: { type: Date, default: Date.now },
  documentType: { 
    type: String, 
    required: true, 
    enum: ["DeliveryNote", "Invoice"]
  },
  items: [
    {
      inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem", required: true }, // 🔹 Directly linking to inventory
      itemName: { type: String, required: true },
      quantity: { type: Number, required: true },
      cost: { type: Number, required: true }
    }
  ]
}, { timestamps: true });

export default mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
