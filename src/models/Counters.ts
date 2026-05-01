import mongoose from 'mongoose';

export const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "SKU"
  seq: { type: Number, default: 0 }
});

export default mongoose.models.Counters ||
  mongoose.model('Counters', CounterSchema);
