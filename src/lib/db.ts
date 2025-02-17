import mongoose from "mongoose";

// 🔹 נייבא את כל המודלים כדי לוודא שהם נטענים עם החיבור ל-DB
import "../models/Inventory";
import "../models/Supplier";  // ✅ הוספת מודל הספקים
import "../models/Invoice";  // ✅ הוספת מודל תעודות משלוח

console.log("🔥 db.ts loaded!"); // ✅ כדי לבדוק שהקובץ נטען

const MONGODB_URI = process.env.MONGODB_URI || "";


if (!MONGODB_URI) {
  throw new Error("❌ Please define the MONGODB_URI in .env.local");
}

// ✅ פונקציה שמתחברת ל-MongoDB, תוך מניעת חיבורים כפולים
export const connectMongo = async () => {
  if (mongoose.connection.readyState >= 1) {
    console.log("⚡ Using existing MongoDB connection");
    return;
  }

  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, {
      dbName: "inventory", // שם מסד הנתונים
      useNewUrlParser: true,
      useUnifiedTopology: true
    } as any);

    console.log("✅ MongoDB connected successfully!");

  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
  }
};

// ✅ הפעלת החיבור כאשר הקובץ נטען
export default connectMongo;
connectMongo();
