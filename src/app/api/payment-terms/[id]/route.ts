import { NextRequest, NextResponse } from "next/server";
import PaymentTerms from "@/models/PaymentTerms";
import { connectMongo } from "@/lib/db";

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
    const paymentTerms = await PaymentTerms.findById(id);

    if (!paymentTerms) {
      return NextResponse.json(
        { error: "paymentTermsNotFound" },
        { status: 404 }
      );
    }

    return NextResponse.json(paymentTerms, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching payment terms:", err);
    return NextResponse.json(
      { error: "errorFetching" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectMongo();

    const body = await request.json();
    const { id } = await context.params;

    // Validate days if being updated
    if (body.days !== undefined && (typeof body.days !== 'number' || body.days < 0)) {
      return NextResponse.json({ error: "daysInvalid" }, { status: 400 });
    }

    const updatedPaymentTerms = await PaymentTerms.findByIdAndUpdate(
      id,
      body,
      { new: true }
    );

    if (!updatedPaymentTerms) {
      return NextResponse.json(
        { error: "paymentTermsNotFound" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { messageKey: "paymentTermsUpdatedSuccess", updatedPaymentTerms },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating payment terms:", error);

    if (error.code === 11000) {
      return NextResponse.json({
        error: "duplicateName"
      }, { status: 409 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectMongo();

    const { id } = await context.params;
    const deleted = await PaymentTerms.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({
        error: "paymentTermsNotFound"
      }, { status: 404 });
    }

    return NextResponse.json(
      { message: "paymentTermsDeletedSuccess" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting payment terms:", error);
    return NextResponse.json(
      { error: "errorDeleting" },
      { status: 500 }
    );
  }
}
