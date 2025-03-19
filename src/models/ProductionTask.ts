import mongoose from 'mongoose';

const productionTaskSchema = new mongoose.Schema(
  {
    taskName: { type: String, required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    plannedQuantity: { type: Number, required: true },
    producedQuantity: { type: Number, default: 0 },
    defectedQuantity: { type: Number, default: 0 },

    // Employee work logs now include full logging details.
    employeeWorkLogs: [
      {
        //employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
        employee: { type: String, required: true },
        startTime: { type: Date, required: true },
        endTime: { type: Date },
        laborPercentage: { type: Number, required: true },
        accumulatedDuration: { type: Number, default: 0 } // in milliseconds
      }
    ],

    // BOM data snapshot for this production task.
    BOMData: [
      {
        rawMaterial: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
        percentageUsed: { type: Number, required: true },
        quantityUsed: { type: Number, required: true }
      }
    ],

    productionDate: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['Pending', 'InProgress', 'Completed', 'Cancelled'],
      default: 'Pending'
    },
    remarks: { type: String },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Pre-save hook to update the updatedAt field.
productionTaskSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.ProductionTask ||
  mongoose.model('ProductionTask', productionTaskSchema);
