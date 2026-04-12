import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import Invoice from "@/models/Invoice";
import InventoryItem from "@/models/Inventory";
import { getSessionUser, requireAuth } from "@/lib/sessionGuard";

/**
 * DELETE /api/invoice/[id]
 * Delete an invoice by ID
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;

    await connectMongo();

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 },
      );
    }

    // Find the invoice first to get its items
    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (sessionUser!.role !== "super_admin" && invoice.tenantId !== sessionUser!.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Error deleting invoice:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
