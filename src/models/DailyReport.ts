import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMaterialUsed {
  materialName: string;
  quantityUsed: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

export interface IProductProduced {
  productName: string;
  quantityProduced: number;
  quantityDefected: number;
  materialsUsed: IMaterialUsed[];
  totalMaterialCost: number;
  productValue: number;
  grossProfit: number;
  grossProfitPercentage: number;
}

export interface IDailyReport extends Document {
  date: string; // "YYYY-MM-DD"
  productsProduced: IProductProduced[];
  totalMaterialCost: number;
  totalProductValue: number;
  totalGrossProfit: number;
  overallGrossProfitPercentage: number;
  generatedAt: Date;
}

const MaterialUsedSchema = new Schema(
  {
    materialName: { type: String, required: true },
    quantityUsed: { type: Number, required: true },
    unit: { type: String, required: true },
    costPerUnit: { type: Number, required: true },
    totalCost: { type: Number, required: true },
  },
  { _id: false }
);

const ProductProducedSchema = new Schema(
  {
    productName: { type: String, required: true },
    quantityProduced: { type: Number, required: true },
    quantityDefected: { type: Number, default: 0 },
    materialsUsed: [MaterialUsedSchema],
    totalMaterialCost: { type: Number, required: true },
    productValue: { type: Number, required: true },
    grossProfit: { type: Number, required: true },
    grossProfitPercentage: { type: Number, required: true },
  },
  { _id: false }
);

const DailyReportSchema: Schema = new Schema({
  date: { type: String, required: true, unique: true, index: true },
  productsProduced: [ProductProducedSchema],
  totalMaterialCost: { type: Number, required: true },
  totalProductValue: { type: Number, required: true },
  totalGrossProfit: { type: Number, required: true },
  overallGrossProfitPercentage: { type: Number, required: true },
  generatedAt: { type: Date, default: Date.now },
});

const DailyReport: Model<IDailyReport> =
  mongoose.models.DailyReport ||
  mongoose.model<IDailyReport>("DailyReport", DailyReportSchema);

export default DailyReport;
