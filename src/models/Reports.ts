import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReportRow extends Document {
  date: string; // "YYYY-MM-DD"
  task: string;
  quantity: number;
  timeWorked: string; // e.g. "2h 15m"
  bomCost: number;
  user: string;
  product: string;
}

const ReportRowSchema: Schema = new Schema({
  date: { type: String, required: true },
  task: { type: String, required: true },
  quantity: { type: Number, required: true },
  timeWorked: { type: String, required: true },
  bomCost: { type: Number, required: true },
  user: { type: String, required: true },
  product: { type: String, required: true },
});

const ReportRow: Model<IReportRow> =
  mongoose.models.ReportRow ||
  mongoose.model<IReportRow>("ReportRow", ReportRowSchema);

export default ReportRow;
