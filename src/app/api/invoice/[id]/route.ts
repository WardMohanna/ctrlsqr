import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import Invoice from "@/models/Invoice";
import InventoryItem from "@/models/Inventory";

/**
 * DELETE /api/invoice/[id]
 * Delete an invoice by ID
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectMongo();

    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    // Find the invoice first to get its items
    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Optional: You may want to reverse the inventory changes
    // For now, we'll just delete the invoice without reversing inventory
    // If you want to reverse inventory:
    // for (const item of invoice.items) {
    //   await InventoryItem.findByIdAndUpdate(
    //     item.inventoryItemId,
    //     { $inc: { quantity: -item.quantity } }
    //   );
    // }

    // Delete the invoice
    await Invoice.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Invoice deleted successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error deleting invoice:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
