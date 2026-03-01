import { NextRequest, NextResponse } from "next/server";
import Account from "@/models/Account";
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

    const accounts = await Account.find({}, projection);
    return NextResponse.json(accounts, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json({ error: "errorFetching" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { officialEntityName, taxId, category, city, address, active, contacts, paymentTerms, creditLimit } = body;

    if (!officialEntityName) {
      return NextResponse.json({ error: "officialEntityNameRequired" }, { status: 400 });
    }

    if (!taxId) {
      return NextResponse.json({ error: "taxIdRequired" }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: "categoryRequired" }, { status: 400 });
    }

    // Validate max 3 contacts
    if (contacts && contacts.length > 3) {
      return NextResponse.json({ error: "maximumThreeContactsAllowed" }, { status: 400 });
    }

    const newAccount = new Account({
      officialEntityName,
      taxId,
      category,
      city,
      address,
      active: active !== undefined ? active : true,
      contacts: contacts || [],
      paymentTerms,
      creditLimit,
    });

    await newAccount.save();
    return NextResponse.json(newAccount, { status: 201 });
  } catch (error: any) {
    console.error("Error creating account:", error);
    // If it's a duplicate key (e.g., unique taxId)
    if (error.code === 11000) {
      if (error.keyPattern?.taxId) {
        return NextResponse.json({
          error: "duplicateTaxId"
        }, { status: 409 });
      }
      return NextResponse.json({
        error: "duplicate"
      }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
