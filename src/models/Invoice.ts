import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: false },
  oneTimeSupplier: { type: String, required: false }, // For one-time suppliers
  documentId: { type: String, required: true },
  filePaths: {
    type: [String],
    default: []
  },
  // 'date' represents the document date (e.g., the date on the invoice or delivery note)
  date: { type: Date, default: Date.now },
  // 'receivedDate' will store the actual date when the inventory was received into the system
  receivedDate: { type: Date, required: true },
  deliveredBy: { type: String, required: false },
  remarks: { type: String, required: false },
  documentType: { 
    type: String, 
    required: true, 
    enum: ["DeliveryNote", "Invoice"]
  },
  items: [
    {
      inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem", required: true },
      itemName: { type: String, required: true },
      quantity: { type: Number, required: true },
      cost: { type: Number, required: true }
    }
  ]
}, { timestamps: true });

export default mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
