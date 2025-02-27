import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  itemName: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: [
      'ProductionRawMaterial',
      'CoffeeshopRawMaterial',
      'CleaningMaterial',
      'Packaging',
      'DisposableEquipment',
      'FinalProduct',
      'SemiFinalProduct'
    ]
  },
  quantity: { type: Number, required: true, default: 0 },
  minQuantity: { type: Number, required: true },
  barcode: { type: String, unique: false }, // optional, not unique

  // e.g. "kg", "pieces", etc.
  unit: { type: String, default: '' },

  clientPrice: { type: Number },
  businessPrice: { type: Number },
  costPrice: { type: Number, default: 0 }, // can be auto-calculated

  // NEW: store the total product weight (in grams) for semi/final
  standardBatchWeight: { type: Number, default: 0 },

  // BOM for Semi-Final / Final products, storing percentages
  components: [
    {
      componentId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
      percentage: { type: Number, required: true }, // 0–100
      partialCost: { type: Number, default: 0 }, // store partial cost here
    }
  ],

  // Stock history
  stockHistory: [
    {
      date: { type: Date, default: Date.now },
      change: { type: Number, required: true },
      type: { type: String, required: true, enum: ['Added', 'Used', 'Spilled', 'Produced', 'Other'] },
      batchReference: { type: String },
      referenceDocument: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }
    }
  ],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Calculate cost for semi/final product
inventorySchema.methods.calculateCost = async function () {
  if (!this.components || this.components.length === 0) {
    return this.costPrice;
  }

  let totalCost = 0;

  for (const component of this.components) {
    // Each component has { componentId, percentage }
    // We assume 'costPrice' on the raw material is cost per 1 kg.
    // The fraction is (percentage / 100) of 1 kg.

    const item = await mongoose.model('InventoryItem').findById(component.componentId);
    if (item) {
      const costPerKg = item.costPrice || 0;
      const fraction = component.percentage / 100;  // fraction of 1 kg
      totalCost += costPerKg * fraction;
    }
  }

  return totalCost;
};

export default mongoose.models.InventoryItem ||
  mongoose.model('InventoryItem', inventorySchema);
