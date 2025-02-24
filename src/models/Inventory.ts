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
  barcode: { type: String, unique: false },

  // 🔹 New "unit" field
  unit: { type: String, default: '' }, // e.g. "kg", "pieces", etc.

  clientPrice: { type: Number },
  businessPrice: { type: Number },
  costPrice: { type: Number, default: 0 }, // 🔹 Auto-calculated from components

  // 🔹 **Components for Semi-Final & Final Products**
  components: [
    {
      componentId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
      weight: { type: Number, required: true } // Weight in grams used in the product
    }
  ],

  // 🔹 **Stock History**
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

// 🔹 **Method to Calculate Cost of a Final or Semi-Final Product**
inventorySchema.methods.calculateCost = async function () {
  if (!this.components || this.components.length === 0) {
    return this.costPrice; // If no components, use stored cost
  }

  let totalCost = 0;
  for (const component of this.components) {
    const item = await mongoose.model('InventoryItem').findById(component.componentId);
    if (item) {
      totalCost += (item.businessPrice / 1000) * component.weight; // Convert kg price to gram price
    }
  }
  return totalCost;
};

export default mongoose.models.InventoryItem ||
  mongoose.model('InventoryItem', inventorySchema);
