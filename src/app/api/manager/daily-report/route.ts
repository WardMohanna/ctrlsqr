import { NextResponse, NextRequest } from "next/server";
import { getDbForTenant } from "@/lib/db";
import { getTenantModels } from "@/lib/tenantModels";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { calculateDailyReport } from "@/lib/dailyReportCalculator";
import { getAppDateKey } from "@/lib/dateTime";

export const maxDuration = 30;

type SavedDailyReport = {
  date: string;
  productsProduced: unknown[];
  totalMaterialCost: number;
  totalProductValue: number;
  totalWorkerCost: number;
  totalGrossProfit: number;
  overallGrossProfitPercentage: number;
  generatedAt?: Date;
} | null;


export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tenantId = (session.user as any)?.tenantId as string | null;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
    }

    const db = await getDbForTenant(tenantId);
    const { DailyReport } = getTenantModels(db);

    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");
    const reportDate = dateParam || getAppDateKey();
    const today = getAppDateKey();
    const isToday = reportDate === today;

    if (!isToday) {
      const savedReport = (await DailyReport.findOne({ date: reportDate }).lean()) as SavedDailyReport;
      if (savedReport) {
        return NextResponse.json(
          {
            date: savedReport.date,
            productsProduced: savedReport.productsProduced,
            totalMaterialCost: savedReport.totalMaterialCost,
            totalProductValue: savedReport.totalProductValue,
            totalWorkerCost: savedReport.totalWorkerCost,
            totalGrossProfit: savedReport.totalGrossProfit,
            overallGrossProfitPercentage: savedReport.overallGrossProfitPercentage,
            source: "saved",
            generatedAt: savedReport.generatedAt,
          },
          { status: 200 },
        );
      }
    }

    const report = await calculateDailyReport(reportDate, db);

    if (!isToday && report.productsProduced.length > 0) {
      try {
        await DailyReport.findOneAndUpdate(
          { date: reportDate },
          { ...report, generatedAt: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      } catch (saveErr) {
        console.error("Auto-save daily report failed:", saveErr);
      }
    }

    return NextResponse.json(
      {
        ...report,
        source: isToday ? "live" : "saved",
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error generating daily report:", error?.message || error, error?.stack);
    return NextResponse.json(
      { error: error?.message || "Unknown error generating report" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tenantId = (session.user as any)?.tenantId as string | null;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const reportDate = body.date;

    if (!reportDate || !/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const db = await getDbForTenant(tenantId);
    const { DailyReport } = getTenantModels(db);
    const reportData = await calculateDailyReport(reportDate, db);

    const saved = await DailyReport.findOneAndUpdate(
      { date: reportDate },
      {
        ...reportData,
        generatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ) as { generatedAt?: Date } | null;

    return NextResponse.json(
      {
        message: "Report generated and saved successfully",
        report: {
          ...reportData,
          source: "saved",
          generatedAt: saved?.generatedAt,
        },
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error saving daily report:", error?.message || error, error?.stack);
    return NextResponse.json(
      { error: error?.message || "Unknown error saving report" },
      { status: 500 },
    );
  }
}
