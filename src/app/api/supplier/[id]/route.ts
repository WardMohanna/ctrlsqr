import { NextRequest, NextResponse } from "next/server";
import { getDbForTenant } from "@/lib/db";
import { getTenantModels } from "@/lib/tenantModels";
import { getSessionUser, requireAuth } from "@/lib/sessionGuard";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;

    const db = await getDbForTenant(sessionUser!.tenantId!);
    const { Supplier } = getTenantModels(db);

    const { id } = await context.params;
    const supplier = await Supplier.findById(id)
      .select("name contactName phone email address taxId paymentTerms")
      .lean();

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    return NextResponse.json(supplier, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching supplier:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;

    const db = await getDbForTenant(sessionUser!.tenantId!);
    const { Supplier } = getTenantModels(db);

    const { id } = await context.params;

    const supplier = await Supplier.findById(id);
    
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    await Supplier.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Supplier deleted successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Error deleting supplier:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
export async function PUT(
    request: NextRequest,
    context: RouteContext
  ): Promise<NextResponse> {
  try {
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;

    const db = await getDbForTenant(sessionUser!.tenantId!);
    const { Supplier } = getTenantModels(db);

    const { id } = await context.params;
    const body = await request.json();

    const update = {
      name: body.name,
      contactName: body.contactName,
      phone: body.phone,
      email: body.email,
      address: body.address,
      taxId: body.taxId,
      paymentTerms: body.paymentTerms,
    };
    const supplier = await Supplier.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    );
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }
    return NextResponse.json(supplier, { status: 200 });
  } catch (err: any) {
    console.error("Error updating supplier:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}