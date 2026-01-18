import { NextResponse } from "next/server";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";

// POST /api/inventory/stock-count
export async function POST(req: Request) {
  try {
    await connectMongo();
    // The body should be an array of objects: [{ _id, newCount }, ...]
    const data = await req.json();

    const results = {
      success: 0,
      failed: 0,
      errors: [] as { _id: string; error: string }[]
    };

    // data.forEach(...) or a for-of loop
    for (const row of data) {
      try {
        const { _id, newCount } = row;
        const item = await InventoryItem.findById(_id);
        if (!item) {
          results.failed++;
          results.errors.push({ _id, error: "Item not found" });
          continue;
        }

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
        results.success++;
      } catch (itemErr: any) {
        results.failed++;
        results.errors.push({ _id: row._id, error: itemErr.message });
      }
    }

    // Return 200 even if some items failed, but report the results
    // This prevents the client from showing an error when some items were actually updated
    return NextResponse.json(
      { 
        message: "Stock count update completed",
        results
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error updating stock count:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
