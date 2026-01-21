import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import ProductionTask from "@/models/ProductionTask";

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const searchParams = req.nextUrl.searchParams;
    const statuses = searchParams.getAll("status[]");
    const limit = parseInt(searchParams.get("limit") || "30");

    console.log("Tasks API - Requested statuses:", statuses);

    // Calculate date range - last 3 days to match tasks page
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const threeDaysAgo = new Date(startOfToday);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const query: any = {
      productionDate: { $gte: threeDaysAgo }
    };
    if (statuses.length > 0) {
      query.status = { $in: statuses };
    }

    console.log("Tasks API - Query:", JSON.stringify(query));

    const tasks = await ProductionTask.find(query)
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    console.log("Tasks API - Found", tasks.length, "tasks");
    console.log("Tasks API - Statuses in results:", tasks.map(t => t.status));

    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}
