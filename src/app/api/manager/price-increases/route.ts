import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import connectMongo from "@/lib/db";
import PriceIncrease from "@/models/PriceIncrease";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const acknowledged = searchParams.get("acknowledged");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  await connectMongo();

  const filter: Record<string, any> = {};

  if (acknowledged === "true") filter.acknowledged = true;
  else if (acknowledged === "false") filter.acknowledged = false;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const [items, unacknowledgedCount] = await Promise.all([
    PriceIncrease.find(filter).sort({ createdAt: -1 }).limit(500).lean(),
    PriceIncrease.countDocuments({ acknowledged: false }),
  ]);

  return NextResponse.json({ items, unacknowledgedCount });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { ids, acknowledgeAll } = body as {
    ids?: string[];
    acknowledgeAll?: boolean;
  };

  await connectMongo();

  if (acknowledgeAll) {
    await PriceIncrease.updateMany(
      { acknowledged: false },
      { $set: { acknowledged: true } }
    );
  } else if (ids && ids.length > 0) {
    await PriceIncrease.updateMany(
      { _id: { $in: ids } },
      { $set: { acknowledged: true } }
    );
  } else {
    return NextResponse.json({ error: "No ids or acknowledgeAll provided" }, { status: 400 });
  }

  const unacknowledgedCount = await PriceIncrease.countDocuments({ acknowledged: false });
  return NextResponse.json({ success: true, unacknowledgedCount });
}
