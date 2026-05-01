import { NextRequest, NextResponse } from "next/server";
import { getDbForTenant } from "@/lib/db";
import { getTenantModels } from "@/lib/tenantModels";
import { getSessionUser, requireAuth } from "@/lib/sessionGuard";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;
    const db = await getDbForTenant(sessionUser!.tenantId!);
    const { InventoryItem } = getTenantModels(db);

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "25");

    // Find items where quantity <= minQuantity
    const lowStockItems = await InventoryItem.find({
      $expr: { $lte: ["$quantity", "$minQuantity"] }
    })
      .select("itemName quantity minQuantity unit category")
      .sort({ quantity: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json(lowStockItems);
  } catch (error: any) {
    console.error("Error fetching low stock items:", error);
    return NextResponse.json({ error: "Failed to fetch low stock items" }, { status: 500 });
  }
}
