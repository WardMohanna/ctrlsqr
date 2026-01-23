import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import InventoryItem from "@/models/Inventory";

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

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
