import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployeeReport extends Document {
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD format
  status: 'pending' | 'approved' | 'rejected';
  
  tasksCompleted: {
    taskId: string;
    taskName: string;
    productName?: string;
    quantityProduced: number;
    quantityDefected: number;
    timeWorked: number; // in milliseconds
    startTime: Date;
    endTime: Date;
  }[];
  
  totalTimeWorked: number; // in milliseconds
  
  // Manager approval
  approvedBy?: string;
  approvedAt?: Date;
  managerNotes?: string;
  
  // Time adjustments by manager
  adjustedTimeWorked?: number; // in milliseconds
  timeAdjustments?: {
    taskId: string;
    originalTime: number;
    adjustedTime: number;
    reason: string;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeReportSchema: Schema = new Schema(
  {
    employeeId: { type: String, required: true },
    employeeName: { type: String, required: true },
    date: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending' 
    },
    
    tasksCompleted: [{
      taskId: { type: String, required: true },
      taskName: { type: String, required: true },
      productName: { type: String },
      quantityProduced: { type: Number, default: 0 },
      quantityDefected: { type: Number, default: 0 },
      timeWorked: { type: Number, required: true },
      startTime: { type: Date, required: true },
      endTime: { type: Date, required: true },
    }],
    
    totalTimeWorked: { type: Number, default: 0 },
    
    approvedBy: { type: String },
    approvedAt: { type: Date },
    managerNotes: { type: String },
    
    adjustedTimeWorked: { type: Number },
    timeAdjustments: [{
      taskId: { type: String },
      originalTime: { type: Number },
      adjustedTime: { type: Number },
      reason: { type: String },
    }],
  },
  { timestamps: true }
);

// Index for efficient querying
EmployeeReportSchema.index({ employeeId: 1, date: 1 });
EmployeeReportSchema.index({ status: 1, date: 1 });

export default mongoose.models.EmployeeReport || 
  mongoose.model<IEmployeeReport>('EmployeeReport', EmployeeReportSchema);
