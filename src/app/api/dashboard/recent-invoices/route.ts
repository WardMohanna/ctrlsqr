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
    const { Invoice } = getTenantModels(db);

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");

    const invoices = await Invoice.find()
      .populate("supplier", "name")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Calculate total for each invoice
    const invoicesWithTotal = invoices.map((inv: any) => {
      const total = inv.items?.reduce((sum: number, item: any) => {
        return sum + (item.cost * item.quantity);
      }, 0) || 0;

      return {
        _id: inv._id,
        supplier: inv.supplier?.name || inv.oneTimeSupplier || "Unknown",
        documentId: inv.documentId,
        date: inv.date,
        totalNis: total,
        documentType: inv.documentType
      };
    });

    return NextResponse.json(invoicesWithTotal);
  } catch (error: any) {
    console.error("Error fetching recent invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}
