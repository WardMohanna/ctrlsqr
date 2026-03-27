import { NextRequest, NextResponse } from "next/server";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";

interface SnapshotHistoryEntry {
  date?: Date;
  change?: number;
}

interface SnapshotInventoryItem {
  _id: string;
  itemName: string;
  category: string;
  currentCostPrice?: number;
  quantity: number;
  createdAt?: Date;
  stockHistory?: SnapshotHistoryEntry[];
}

/**
 * GET /api/inventory/snapshot?date=YYYY-MM-DD
 * Returns an array of items with { itemName, category, snapshotQty, currentCostPrice }
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

    const dateParts = dateParam.split("-").map(Number);
    if (dateParts.length !== 3 || dateParts.some(Number.isNaN)) {
      return NextResponse.json({ error: "Invalid 'date' parameter" }, { status: 400 });
    }

    const [year, month, day] = dateParts;
    const targetDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    // 2) Fetch all items
    //    Fetch only the fields needed for snapshot rollback.
    const items = await InventoryItem.find(
      {},
      {
        itemName: 1,
        category: 1,
        currentCostPrice: 1,
        quantity: 1,
        createdAt: 1,
        "stockHistory.date": 1,
        "stockHistory.change": 1,
      },
    ).lean<SnapshotInventoryItem[]>();

    // Build an array of results
    const results = items.map((item) => {
      // If item was created after targetDate => snapshotQty = 0
      if (item.createdAt && item.createdAt > targetDate) {
        return {
          _id: item._id,
          itemName: item.itemName,
          category: item.category,
          currentCostPrice: item.currentCostPrice || 0, // updated field
          snapshotQty: 0,
        };
      }

      // Otherwise, roll back from current quantity
      let sumOfChangesAfter = 0;
      for (const entry of item.stockHistory ?? []) {
        // if entry.date > targetDate, subtract that from the current quantity
        if (entry.date && entry.date > targetDate) {
          sumOfChangesAfter += entry.change ?? 0; // note: + for added, - for used
        }
      }
      const snapshotQty = item.quantity - sumOfChangesAfter;

      return {
        _id: item._id,
        itemName: item.itemName,
        category: item.category,
        currentCostPrice: item.currentCostPrice || 0, // updated field
        snapshotQty,
      };
    });

    results.sort((left, right) => {
      const categoryCompare = left.category.localeCompare(right.category);
      if (categoryCompare !== 0) {
        return categoryCompare;
      }

      return left.itemName.localeCompare(right.itemName);
    });

    return NextResponse.json(results, { status: 200 });
  } catch (err: any) {
    console.error("Error generating snapshot:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
