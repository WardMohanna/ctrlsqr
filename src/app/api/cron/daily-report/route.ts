import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/lib/db";
import DailyReport from "@/models/DailyReport";
import { calculateDailyReport } from "@/lib/dailyReportCalculator";

/**
 * GET /api/cron/daily-report?secret=YOUR_CRON_SECRET
 *
 * Intended to be called by an external cron service (e.g., Vercel Cron, 
 * GitHub Actions, cron-job.org, or Windows Task Scheduler) at the end of each day.
 *
 * Calculates and saves the daily report for yesterday.
 * Protected by CRON_SECRET environment variable.
 *
 * Example cron schedule: Run daily at 23:55 or 00:05
 *   curl "https://your-domain.com/api/cron/daily-report?secret=YOUR_CRON_SECRET"
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const secret = request.nextUrl.searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || secret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongo();

    // Calculate yesterday's date
    const dateParam = request.nextUrl.searchParams.get("date");
    let reportDate: string;

    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      reportDate = dateParam;
    } else {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      reportDate = yesterday.toISOString().slice(0, 10);
    }

    // Calculate the report
    const reportData = await calculateDailyReport(reportDate);

    // Save or overwrite in DB
    await DailyReport.findOneAndUpdate(
      { date: reportDate },
      {
        ...reportData,
        generatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`[CRON] Daily report generated and saved for ${reportDate}`);

    return NextResponse.json({
      success: true,
      date: reportDate,
      productsCount: reportData.productsProduced.length,
      totalGrossProfit: reportData.totalGrossProfit,
    }, { status: 200 });
  } catch (error: any) {
    console.error("[CRON] Error generating daily report:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
