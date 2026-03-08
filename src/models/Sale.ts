import mongoose from "mongoose";

const SaleItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true,
  },
  productName: { type: String, required: true },
  productType: {
    type: String,
    enum: ['FinalProduct', 'SemiFinalProduct', 'ProductionRawMaterial', 'CoffeeshopRawMaterial', 'WorkShopRawMaterial', 'CleaningMaterial', 'Packaging', 'DisposableEquipment'],
    required: true,
  },
  quantity: { type: Number, required: true },
  unitPriceSnapshot: { type: Number, required: true }, // Price at time of sale
  lineDiscount: { type: Number, default: 0 }, // Optional line-level discount (percentage or fixed amount)
  lineTotal: { type: Number, required: true }, // quantity * unitPriceSnapshot - lineDiscount
});

const SaleSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
  },
  saleNumber: { type: String, required: true, unique: true }, // Auto-generated Sale ID
  saleDate: { type: Date, default: Date.now },

  // Sale Items
  items: [SaleItemSchema],

  // Pricing Snapshot
  totalBeforeDiscount: { type: Number, required: true }, // Sum of all lineTotal before global discount
  totalDiscount: { type: Number, default: 0 }, // Global sale-level discount
  finalTotal: { type: Number, required: true }, // totalBeforeDiscount - totalDiscount

  // Notes
  notes: { type: String },

  // Import tracking
  importedFrom: { type: String }, // PDF file name if imported
  status: { type: String, enum: ['Draft', 'Confirmed'], default: 'Confirmed' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.Sale || mongoose.model("Sale", SaleSchema);
