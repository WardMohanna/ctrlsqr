import { NextResponse } from "next/server";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";

// POST /api/inventory/stock-count
export async function POST(req: Request) {
  try {
    await connectMongo();
    // The body should be an array of objects: [{ _id, newCount }, ...]
    const data = await req.json();

    // data.forEach(...) or a for-of loop
    for (const row of data) {
      const { _id, newCount } = row;
      const item = await InventoryItem.findById(_id);
      if (!item) continue; // skip if no match

      const oldQty = item.quantity;
      const diff = newCount - oldQty;

      // Update the quantity
      item.quantity = newCount;

      // Log a stockHistory entry
      item.stockHistory.push({
        date: new Date(),
        change: diff,
        type: "StockCount", // or "Adjustment"
        batchReference: "Manual Count"
      });

      await item.save();
    }

    return NextResponse.json(
      { message: "Stock count updated successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error updating stock count:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
