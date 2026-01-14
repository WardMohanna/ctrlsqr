import { NextRequest, NextResponse } from "next/server";
import Supplier from "@/models/Supplier";
import { connectMongo } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    
    const { searchParams } = new URL(req.url);
    const fieldsParam = searchParams.get("fields");
    
    // Build field projection
    let projection = null;
    if (fieldsParam) {
      projection = fieldsParam.split(",").reduce((acc, field) => {
        acc[field.trim()] = 1;
        return acc;
      }, {} as any);
    }
    
    const suppliers = await Supplier.find({}, projection);
    return NextResponse.json(suppliers, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { name, contactName, phone, email, address, taxId, paymentTerms } = body;

    if (!name) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    const newSupplier = new Supplier({
      name,
      contactName,
      phone,
      email,
      address,
      taxId,
      paymentTerms,
    });

    await newSupplier.save();
    return NextResponse.json(newSupplier, { status: 201 });
  } catch (error: any) {
    console.error("Error creating supplier:", error);
    // If it's a duplicate key (e.g., unique name or taxId) we can handle specifically
    if (error.code === 11000) {
      return NextResponse.json({ error: "Supplier already exists (duplicate key)" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
