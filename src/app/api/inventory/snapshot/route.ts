import { NextRequest, NextResponse } from "next/server";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";

/**
 * GET /api/inventory/snapshot?date=YYYY-MM-DD
 * Returns an array of items with { itemName, category, snapshotQty, costPrice }
 */
export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    // 1) Parse the date from query params
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    if (!dateParam) {
      return NextResponse.json({ error: "Missing 'date' parameter" }, { status: 400 });
    }
    const targetDate = new Date(dateParam);

    // 2) Fetch all items
    //    We'll do a simple .find() and handle roll-back in code
    const items = await InventoryItem.find();

    // Build an array of results
    const results = items.map((item) => {
      // If item was created after targetDate => snapshotQty = 0
      if (item.createdAt > targetDate) {
        return {
          _id: item._id,
          itemName: item.itemName,
          category: item.category,
          costPrice: item.currentCostPrice || 0, // updated field
          snapshotQty: 0,
        };
      }

      // Otherwise, roll back from current quantity
      let sumOfChangesAfter = 0;
      for (const entry of item.stockHistory) {
        // if entry.date > targetDate, subtract that from the current quantity
        if (entry.date > targetDate) {
          sumOfChangesAfter += entry.change; // note: + for added, - for used
        }
      }
      const snapshotQty = item.quantity - sumOfChangesAfter;

      return {
        _id: item._id,
        itemName: item.itemName,
        category: item.category,
        costPrice: item.currentCostPrice || 0, // updated field
        snapshotQty,
      };
    });

    return NextResponse.json(results, { status: 200 });
  } catch (err: any) {
    console.error("Error generating snapshot:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
