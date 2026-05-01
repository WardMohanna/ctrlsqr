import { NextRequest, NextResponse } from "next/server";
import { getDbForTenant } from "@/lib/db";
import { getTenantModels } from "@/lib/tenantModels";
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

    const db = await getDbForTenant(sessionUser!.tenantId!);
    const { Invoice } = getTenantModels(db);

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
