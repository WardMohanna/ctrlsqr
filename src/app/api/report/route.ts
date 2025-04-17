import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/lib/db";
import ProductionTask from "@/models/ProductionTask";
import { getServerSession } from "next-auth";
import ReportRow, { IReportRow } from "@/models/Reports";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  let result = "";
  if (hours > 0) result += `${hours}h `;
  result += `${minutes}m ${seconds}s`;
  return result.trim();
}

export async function GET() {
  try {
    await connectMongo();

    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    const userId = session.user.id || session.user.email;

    // Query for all report rows for the current user.
    const reports = await ReportRow.find({ user: userId });
    
    return NextResponse.json({ report: reports }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongo();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = session.user.id || session.user.email;

    const { taskIds } = await request.json() as { taskIds: string[] };
    
    // For each task ID, fetch the task and generate a report row for the current user.
    const reportPromises = taskIds.map(async (id) => {
      const task = await ProductionTask.findById(id).populate("product", "itemName");
      if (!task) return null;
      
      // Skip constant tasks: only generate a report row for production tasks.
      if (task.taskType !== "Production") return null;
      
      // Calculate total time worked by the user in this task.
      let totalMS = 0;
      task.employeeWorkLogs.forEach((log: any) => {
        if (String(log.employee) === userId && log.endTime) {
          const start = new Date(log.startTime).getTime();
          const end = new Date(log.endTime).getTime();
          totalMS += (end - start);
        }
      });
      const timeWorked = formatDuration(totalMS);
      
      // Use producedQuantity if available; otherwise, fallback to plannedQuantity.
      const quantity = task.producedQuantity || task.plannedQuantity;

      // Use taskName or product name for task.
      const taskName = task.taskType === "Production" 
        ? (task.product?.itemName || "Production Task")
        : (task.taskName || "Task");
      
      // For BOM cost, assume 0 if not calculated.
      const bomCost = 0;
      
      // Use today's date (or you could also use task.productionDate)
      const reportDate = new Date().toISOString().slice(0, 10);
      
      // Create a new report row.
      const reportRowData: Partial<IReportRow> = {
        date: reportDate,
        task: taskName,
        quantity,
        timeWorked,
        bomCost,
        user: userId || "",
        product: task.taskType === "Production" ? (task.product?.itemName || "") : "",
      };
      
      return ReportRow.create(reportRowData);
    });

    const reportRows = await Promise.all(reportPromises);
    // Filter out any null rows (if task not found or if constant tasks were skipped)
    const filteredRows = reportRows.filter((row) => row !== null);

    return NextResponse.json({ message: "Report generated", report: filteredRows }, { status: 200 });
  } catch (error: any) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
