import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import ProductionTask from "@/models/ProductionTask";

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const searchParams = req.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "14");

    // Get tasks from the last N days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const tasks = await ProductionTask.find({
      createdAt: { $gte: startDate }
    })
      .select("createdAt status qualityCheck")
      .sort({ createdAt: 1 })
      .lean();

    // Group by date and calculate quality metrics
    const trendData: { [key: string]: { total: number; passed: number } } = {};

    tasks.forEach((task: any) => {
      const dateKey = new Date(task.createdAt).toISOString().split('T')[0];
      
      if (!trendData[dateKey]) {
        trendData[dateKey] = { total: 0, passed: 0 };
      }
      
      trendData[dateKey].total += 1;
      
      // Count as passed if quality check is OK or task is completed without issues
      if (task.qualityCheck === "OK" || task.status === "Completed") {
        trendData[dateKey].passed += 1;
      }
    });

    // Convert to array format
    const trend = Object.entries(trendData).map(([date, data]) => ({
      date,
      total: data.total,
      passed: data.passed,
      passRate: data.total > 0 ? (data.passed / data.total) * 100 : 0
    }));

    return NextResponse.json(trend);
  } catch (error: any) {
    console.error("Error fetching quality trend:", error);
    return NextResponse.json({ error: "Failed to fetch quality trend" }, { status: 500 });
  }
}
