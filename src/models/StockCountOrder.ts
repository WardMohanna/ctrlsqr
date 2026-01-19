import mongoose from 'mongoose';

const stockCountOrderSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  itemOrder: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
    }
  ],
  updatedAt: { type: Date, default: Date.now },
});

export const StockCountOrder = mongoose.models.StockCountOrder || mongoose.model('StockCountOrder', stockCountOrderSchema);
