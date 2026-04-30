import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import AccountCategory from "@/models/AccountCategory";
import { getSessionUser, requireAuth } from "@/lib/sessionGuard";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;
    await connectMongo();

    const categories = await AccountCategory.find({}).sort({ createdAt: -1 });
    return NextResponse.json(categories, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching account categories:", error);
    return NextResponse.json({ error: "errorFetching" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;
    await connectMongo();

    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "nameRequired" }, { status: 400 });
    }

    const newCategory = new AccountCategory({
      name,
      description,
    });

    await newCategory.save();
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    console.error("Error creating account category:", error);

    if (error.code === 11000) {
      return NextResponse.json({
        error: "duplicateName"
      }, { status: 409 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
