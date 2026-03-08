import { NextRequest, NextResponse } from "next/server";
import PaymentTerms from "@/models/PaymentTerms";
import { connectMongo } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const terms = await PaymentTerms.find({}).sort({ days: 1 });
    return NextResponse.json(terms, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching payment terms:", error);
    return NextResponse.json({ error: "errorFetching" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { name, days, description } = body;

    if (!name) {
      return NextResponse.json({ error: "nameRequired" }, { status: 400 });
    }

    if (!days || typeof days !== 'number' || days < 0) {
      return NextResponse.json({ error: "daysRequired" }, { status: 400 });
    }

    const newPaymentTerms = new PaymentTerms({
      name,
      days,
      description,
    });

    await newPaymentTerms.save();
    return NextResponse.json(newPaymentTerms, { status: 201 });
  } catch (error: any) {
    console.error("Error creating payment terms:", error);

    if (error.code === 11000) {
      return NextResponse.json({
        error: "duplicateName"
      }, { status: 409 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
