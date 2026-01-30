import mongoose from "mongoose";

// Import models to ensure they're loaded with the DB connection
import "../models/Inventory";
import "../models/Supplier";
import "../models/Invoice";

const MONGODB_URI = process.env.MONGODB_URI || "";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI in .env.local");
}

// Connect to MongoDB, preventing duplicate connections
export const connectMongo = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "inventory",
      useNewUrlParser: true,
      useUnifiedTopology: true
    } as any);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

export default connectMongo;
connectMongo();
