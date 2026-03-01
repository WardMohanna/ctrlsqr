import { NextRequest, NextResponse } from "next/server";
import Sale from "@/models/Sale";
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
    const sale = await Sale.findById(id).populate('accountId');

    if (!sale) {
      return NextResponse.json(
        { error: "saleNotFound" },
        { status: 404 }
      );
    }

    return NextResponse.json(sale, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching sale:", err);
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

    // Only allow updating notes and status for confirmed sales
    // Don't allow modification of items/prices after creation
    const allowedFields = ['notes', 'status'];
    const updateData = {};

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const updatedSale = await Sale.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('accountId');

    if (!updatedSale) {
      return NextResponse.json(
        { error: "saleNotFound" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { messageKey: "saleUpdatedSuccess", updatedSale },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating sale:", error);
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
    const deleted = await Sale.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({
        error: "saleNotFound"
      }, { status: 404 });
    }

    return NextResponse.json(
      { message: "saleDeletedSuccess" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting sale:", error);
    return NextResponse.json(
      { error: "errorDeleting" },
      { status: 500 }
    );
  }
}
