import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import Supplier from "@/models/Supplier";

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectMongo();
    const { id } = await context.params;
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }
    return NextResponse.json(supplier, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching supplier:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
    request: NextRequest,
    context: RouteContext
  ): Promise<NextResponse> {
  try {
    await connectMongo();
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