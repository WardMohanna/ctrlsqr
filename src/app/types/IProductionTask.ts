import { Document } from 'mongoose';

export interface IEmployeeWorkLog {
  employee: string; // ObjectId as string
  startTime: Date;
  endTime?: Date;
  laborPercentage: number;
  accumulatedDuration?: number; // in milliseconds
}

export interface IBOMData {
  rawMaterial: string; // ObjectId as string
  percentageUsed: number;
  quantityUsed: number;
}

export interface IProductionTask extends Document {
  taskName: string;
  product: string; // Reference to InventoryItem ID
  plannedQuantity: number;
  producedQuantity: number;
  defectedQuantity: number;
  employeeWorkLogs: IEmployeeWorkLog[];
  BOMData: IBOMData[];
  productionDate: Date;
  status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
  remarks?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
