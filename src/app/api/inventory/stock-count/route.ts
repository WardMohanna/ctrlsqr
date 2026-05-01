import { NextResponse, NextRequest } from "next/server";
import { getDbForTenant } from "@/lib/db";
import { getTenantModels } from "@/lib/tenantModels";
import { getSessionUser, requireAuth } from "@/lib/sessionGuard";

interface StockCountRow {
  _id?: string;
  newCount?: number;
}

// POST /api/inventory/stock-count
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;
    const db = await getDbForTenant(sessionUser!.tenantId!);
    const { InventoryItem } = getTenantModels(db);

    // The body should be an array of objects: [{ _id, newCount }, ...]
    const data = (await req.json()) as StockCountRow[];

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { error: "Stock count payload must be a non-empty array" },
        { status: 400 },
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as { _id: string; error: string }[]
    };

    const normalizedRows = new Map<string, number>();

    for (const row of data) {
      try {
        const itemId = row._id;
        const newCount = row.newCount;

        if (!itemId) {
          results.failed++;
          results.errors.push({ _id: "unknown", error: "Item ID is required" });
          continue;
        }

        if (typeof newCount !== "number" || Number.isNaN(newCount) || newCount < 0) {
          results.failed++;
          results.errors.push({ _id: itemId, error: "newCount must be a valid non-negative number" });
          continue;
        }

        normalizedRows.set(itemId, newCount);
      } catch (itemErr: any) {
        results.failed++;
        results.errors.push({ _id: row._id ?? "unknown", error: itemErr.message });
      }
    }

    const itemIds = Array.from(normalizedRows.keys());

    if (itemIds.length === 0) {
      return NextResponse.json(
        {
          message: "No valid stock count rows provided",
          results,
        },
        { status: 200 },
      );
    }

    const existingItems = await InventoryItem.find(
      { _id: { $in: itemIds } },
      { _id: 1, quantity: 1 },
    ).lean();

    const existingItemsMap = new Map(
      existingItems.map((item) => [String(item._id), item.quantity ?? 0]),
    );

    const now = new Date();
    const bulkOperations = [];

    for (const [itemId, newCount] of normalizedRows.entries()) {
      const oldQty = existingItemsMap.get(itemId);
      if (oldQty === undefined) {
        results.failed++;
        results.errors.push({ _id: itemId, error: "Item not found" });
        continue;
      }

      bulkOperations.push({
        updateOne: {
          filter: { _id: itemId },
          update: {
            $set: {
              quantity: newCount,
              updatedAt: now,
            },
            $push: {
              stockHistory: {
                date: now,
                change: newCount - oldQty,
                type: "StockCount",
                batchReference: "Manual Count",
              },
            },
          },
        },
      });
    }

    if (bulkOperations.length > 0) {
      await InventoryItem.bulkWrite(bulkOperations, { ordered: false });
      results.success = bulkOperations.length;
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
