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
    return NextResponse.json({ error: "errorFetching" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { name, contactName, phone, email, address, taxId, paymentTerms } = body;

    if (!name) {
      return NextResponse.json({ error: "nameRequired" }, { status: 400 });
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
    // If it's a duplicate key (e.g., unique taxId)
    if (error.code === 11000) {
      // Check which field caused the duplicate
      if (error.keyPattern?.taxId) {
        return NextResponse.json({ 
          error: "duplicateTaxId" 
        }, { status: 409 });
      } else if (error.keyPattern?.name) {
        return NextResponse.json({ 
          error: "duplicateName" 
        }, { status: 409 });
      }
      return NextResponse.json({ 
        error: "duplicate" 
      }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
