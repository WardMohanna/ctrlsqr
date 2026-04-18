import { NextResponse, NextRequest } from "next/server";
import { getDbForTenant } from "@/lib/db";
import { getTenantModels } from "@/lib/tenantModels";
import { getSessionUser, requireAuth } from "@/lib/sessionGuard";

// GET /api/inventory/stock-count/order?category=CategoryName
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;
    const db = await getDbForTenant(sessionUser!.tenantId!);
    const { StockCountOrder } = getTenantModels(db);

    const url = new URL(req.url);
    const category = url.searchParams.get("category");

    if (!category) {
      return NextResponse.json(
        { error: "Category parameter is required" },
        { status: 400 }
      );
    }

    const stockCountOrder = await StockCountOrder.findOne(
      { category },
      { itemOrder: 1, _id: 0 },
    ).lean();

    if (!stockCountOrder) {
      // No order saved yet
      return NextResponse.json({ itemOrder: [] });
    }

    return NextResponse.json(stockCountOrder);
  } catch (err: any) {
    console.error("Error fetching stock count order:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch order" },
      { status: 500 }
    );
  }
}

// POST/PUT /api/inventory/stock-count/order
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;
    const db = await getDbForTenant(sessionUser!.tenantId!);
    const { StockCountOrder } = getTenantModels(db);

    const { category, itemOrder } = await req.json();

    if (!category || !Array.isArray(itemOrder)) {
      return NextResponse.json(
        { error: "Category and itemOrder array are required" },
        { status: 400 }
      );
    }

    const stockCountOrder = await StockCountOrder.findOneAndUpdate(
      { category },
      { category, itemOrder, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json(stockCountOrder);
  } catch (err: any) {
    console.error("Error saving stock count order:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save order" },
      { status: 500 }
    );
  }
}
