import { NextRequest, NextResponse } from "next/server";
import Account from "@/models/Account";
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
    const account = await Account.findById(id);

    if (!account) {
      return NextResponse.json(
        { error: "accountNotFound" },
        { status: 404 }
      );
    }

    return NextResponse.json(account, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching account:", err);
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

    // Validate max 3 contacts
    if (body.contacts && body.contacts.length > 3) {
      return NextResponse.json({ error: "maximumThreeContactsAllowed" }, { status: 400 });
    }

    const updatedAccount = await Account.findByIdAndUpdate(
      id,
      body,
      { new: true }
    );

    if (!updatedAccount) {
      return NextResponse.json(
        { error: "accountNotFound" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { messageKey: "accountUpdatedSuccess", updatedAccount },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating account:", error);

    // Handle duplicate taxId error
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

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectMongo();

    const { id } = await context.params;
    const deleted = await Account.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({
        error: "accountNotFound"
      }, { status: 404 });
    }

    return NextResponse.json(
      { message: "accountDeletedSuccess" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "errorDeleting" },
      { status: 500 }
    );
  }
}
