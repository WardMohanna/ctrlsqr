import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/lib/db";
import DailyReport from "@/models/DailyReport";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { calculateDailyReport } from "@/lib/dailyReportCalculator";

/**
 * GET /api/manager/daily-report?date=YYYY-MM-DD
 *
 * For past dates: returns the pre-calculated saved report if available,
 * otherwise calculates on-the-fly.
 * For today: always calculates live (data may still be changing).
 *
 * Response includes `source: "saved" | "live"` so the UI can show status.
 */
export async function GET(request: NextRequest) {
  try {
    await connectMongo();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");
    const reportDate = dateParam || new Date().toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const isToday = reportDate === today;

    // For past dates, try to find a saved report first
    if (!isToday) {
      const savedReport = await DailyReport.findOne({ date: reportDate }).lean();
      if (savedReport) {
        return NextResponse.json({
          date: savedReport.date,
          productsProduced: savedReport.productsProduced,
          totalMaterialCost: savedReport.totalMaterialCost,
          totalProductValue: savedReport.totalProductValue,
          totalGrossProfit: savedReport.totalGrossProfit,
          overallGrossProfitPercentage: savedReport.overallGrossProfitPercentage,
          source: "saved",
          generatedAt: savedReport.generatedAt,
        }, { status: 200 });
      }
    }

    // Calculate live
    const report = await calculateDailyReport(reportDate);

    // Auto-save past dates so they load instantly next time
    if (!isToday && report.productsProduced.length > 0) {
      try {
        await DailyReport.findOneAndUpdate(
          { date: reportDate },
          { ...report, generatedAt: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (saveErr) {
        // Non-critical — log but still return the report
        console.error("Auto-save daily report failed:", saveErr);
      }
    }

    return NextResponse.json({
      ...report,
      source: isToday ? "live" : "saved",
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error generating daily report:", error?.message || error, error?.stack);
    return NextResponse.json(
      { error: error?.message || "Unknown error generating report" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/manager/daily-report
 * Body: { date: "YYYY-MM-DD" }
 *
 * Calculates the report for the given date and saves/overwrites it in DB.
 * Use this to manually trigger report generation, or from a cron job.
 */
export async function POST(request: NextRequest) {
  try {
    await connectMongo();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only admins can generate saved reports
    const userRole = (session.user as any).role;
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const reportDate = body.date;

    if (!reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Calculate the report
    const reportData = await calculateDailyReport(reportDate);

    // Save or overwrite in DB
    const saved = await DailyReport.findOneAndUpdate(
      { date: reportDate },
      {
        ...reportData,
        generatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      message: "Report generated and saved successfully",
      report: {
        ...reportData,
        source: "saved",
        generatedAt: saved.generatedAt,
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error("Error saving daily report:", error?.message || error, error?.stack);
    return NextResponse.json(
      { error: error?.message || "Unknown error saving report" },
      { status: 500 }
    );
  }
}
