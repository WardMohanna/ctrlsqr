import { NextRequest, NextResponse } from "next/server";
import Supplier from "@/models/Supplier";
import { connectMongo } from "@/lib/db";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    
    const { searchParams } = new URL(req.url);
    const fieldsParam = searchParams.get("fields");
    const paginated = searchParams.get("paginated") === "true";
    const page = Math.max(Number(searchParams.get("page") || "1"), 1);
    const rawLimit = Number(searchParams.get("limit") || "15");
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const search = searchParams.get("search")?.trim() || "";
    
    // Build field projection
    let projection = null;
    if (fieldsParam) {
      projection = fieldsParam.split(",").reduce((acc, field) => {
        acc[field.trim()] = 1;
        return acc;
      }, {} as any);
    }

    const filter = search
      ? {
          $or: [
            { name: { $regex: escapeRegex(search), $options: "i" } },
            { contactName: { $regex: escapeRegex(search), $options: "i" } },
            { phone: { $regex: escapeRegex(search), $options: "i" } },
            { email: { $regex: escapeRegex(search), $options: "i" } },
            { taxId: { $regex: escapeRegex(search), $options: "i" } },
          ],
        }
      : {};
    
    if (paginated) {
      const [suppliers, total] = await Promise.all([
        Supplier.find(filter, projection)
          .sort({ name: 1, _id: 1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Supplier.countDocuments(filter),
      ]);

      return NextResponse.json(
        {
          items: suppliers,
          total,
          page,
          limit,
        },
        { status: 200 },
      );
    }

    const suppliers = await Supplier.find(filter, projection)
      .sort({ name: 1, _id: 1 })
      .lean();

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
