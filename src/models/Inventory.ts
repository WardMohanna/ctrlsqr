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
  barcode: { type: String },

  unit: { type: String, default: '' },

  currentClientPrice: { type: Number },
  currentBusinessPrice: { type: Number },
  currentCostPrice: { type: Number, default: 0 },

  clientPriceHistory: [
    {
      price: Number,
      date: { type: Date, default: Date.now },
    }
  ],

  businessPriceHistory: [
    {
      price: Number,
      date: { type: Date, default: Date.now },
    }
  ],

  costPriceHistory: [
    {
      price: Number,
      date: { type: Date, default: Date.now },
    }
  ],

  standardBatchWeight: { type: Number, default: 0 },

  components: [
    {
      componentId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
      percentage: { type: Number, required: true },
      partialCost: { type: Number, default: 0 },
    }
  ],

  stockHistory: [
    {
      date: { type: Date, default: Date.now },
      change: { type: Number, required: true },
      type: { type: String, required: true, enum: ['Added', 'Used', 'Spilled', 'Produced', 'Other', 'StockCount'] },
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
    return this.currentCostPrice;
  }

  let totalCost = 0;

  for (const component of this.components) {
    const item = await mongoose.model('InventoryItem').findById(component.componentId);
    if (item) {
      const costPerKg = item.currentCostPrice || 0;
      const fraction = component.percentage / 100;
      totalCost += costPerKg * fraction;
    }
  }

  return totalCost;
};

export default mongoose.models.InventoryItem ||
  mongoose.model('InventoryItem', inventorySchema);
