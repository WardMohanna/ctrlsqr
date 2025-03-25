import mongoose from 'mongoose';

const productionTaskSchema = new mongoose.Schema(
  {
    taskName: { type: String, required: true },

    // Optional: only required for Production tasks
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },

    plannedQuantity: { type: Number, default: 0 },
    producedQuantity: { type: Number, default: 0 },
    defectedQuantity: { type: Number, default: 0 },

    // 🔥 NEW: Task type support
    taskType: {
      type: String,
      enum: [
        'Production',
        'Cleaning',
        'Break',
        'CoffeeshopOpening',
        'Selling',
        'Packaging',
        'Recycling',
      ],
      default: 'Production',
    },

    // Employee logs
    employeeWorkLogs: [
      {
        //employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
        employee: { type: String, required: true },
        startTime: { type: Date, required: true },
        endTime: { type: Date },
        laborPercentage: { type: Number, required: true },
        accumulatedDuration: { type: Number, default: 0 },
      },
    ],

    // BOM snapshot — for Production tasks
    BOMData: [
      {
        rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        quantityUsed: { type: Number, required: true }
      }
    ],

    productionDate: { type: Date, default: Date.now },

    status: {
      type: String,
      enum: ['Pending', 'InProgress', 'Completed', 'Cancelled'],
      default: 'Pending',
    },

    remarks: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Auto-update `updatedAt`
productionTaskSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.ProductionTask ||
  mongoose.model('ProductionTask', productionTaskSchema);
