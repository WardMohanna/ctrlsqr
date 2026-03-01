import { NextRequest, NextResponse } from "next/server";
import AccountCategory from "@/models/AccountCategory";
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
    const category = await AccountCategory.findById(id);

    if (!category) {
      return NextResponse.json(
        { error: "categoryNotFound" },
        { status: 404 }
      );
    }

    return NextResponse.json(category, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching account category:", err);
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

    const updatedCategory = await AccountCategory.findByIdAndUpdate(
      id,
      body,
      { new: true }
    );

    if (!updatedCategory) {
      return NextResponse.json(
        { error: "categoryNotFound" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { messageKey: "categoryUpdatedSuccess", updatedCategory },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating account category:", error);

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
    const deleted = await AccountCategory.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({
        error: "categoryNotFound"
      }, { status: 404 });
    }

    return NextResponse.json(
      { message: "categoryDeletedSuccess" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting account category:", error);
    return NextResponse.json(
      { error: "errorDeleting" },
      { status: 500 }
    );
  }
}
