import mongoose from 'mongoose';

/** Explicit sub-schema so `orderLines.product` can be populated (Mongoose strictPopulate). */
const orderLineSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, min: 0 },
  },
  { _id: false },
);

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
        'CustomerOrder',
        'BusinessCustomer',
        'Cleaning',
        'Break',
        'CoffeeshopOpening',
        'Selling',
        'Packaging',
        'Recycling',
      ],
      default: 'Production',
    },

    /** Inline board draft — incomplete until user saves details */
    isDraft: { type: Boolean, default: false },

    customerName: { type: String, trim: true },
    businessCustomerName: { type: String, trim: true },

    orderLines: { type: [orderLineSchema], default: [] },

    orderTotalPrice: { type: Number, default: 0, min: 0 },
    deliveryDate: { type: Date },

    attachmentUrl: { type: String },
    attachmentOriginalName: { type: String },
    attachmentMimeType: { type: String },

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
    executionDate: { type: Date },

    status: {
      type: String,
      enum: ['Pending', 'InProgress', 'Completed', 'Cancelled'],
      default: 'Pending',
    },

    remarks: { type: String },

    epic: { type: mongoose.Schema.Types.ObjectId, ref: "Epic", required: false },

    /** User.id (UUID) — who created the task (immutable after insert) */
    createdBy: { type: String },
    /** User.id — task owner (transferable by owner or manager) */
    ownerId: { type: String },
    /** User.id[] — who should work on the task (managers may edit) */
    assigneeIds: { type: [String], default: [] },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound indexes for date-based production lookups
productionTaskSchema.index({ product: 1, status: 1, taskType: 1, productionDate: 1 });
productionTaskSchema.index({ product: 1, status: 1, taskType: 1, executionDate: 1 });

// Auto-update `updatedAt`
productionTaskSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.ProductionTask ||
  mongoose.model('ProductionTask', productionTaskSchema);
