import { NextResponse, NextRequest } from "next/server";
import { getDbForTenant } from "@/lib/db";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { IReportRow } from "@/models/Reports";
import { getTenantModels } from "@/lib/tenantModels";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { getAppDateKey, getAppDateRange } from "@/lib/dateTime";

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

function getLogDurationMs(log: any, fallbackEndTime?: Date | string): number {
  if (typeof log?.accumulatedDuration === "number" && log.accumulatedDuration > 0) {
    return log.accumulatedDuration;
  }

  const endTime = log?.endTime || fallbackEndTime;

  if (!log?.startTime || !endTime) {
    return 0;
  }

  const start = new Date(log.startTime).getTime();
  const end = new Date(endTime).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }

  return end - start;
}

function getReportDateQuery(startDate?: string | null, endDate?: string | null) {
  const query: any = {
    status: "Completed",
    taskType: "Production",
  };

  if (!startDate && !endDate) {
    return query;
  }

  const start = startDate ? getAppDateRange(startDate).start : undefined;
  const end = endDate ? getAppDateRange(endDate).end : undefined;
  const dateRange: any = {};

  if (start) dateRange.$gte = start;
  if (end) dateRange.$lte = end;

  query.$or = [
    { executionDate: dateRange },
    {
      executionDate: { $exists: false },
      productionDate: dateRange,
    },
    {
      executionDate: null,
      productionDate: dateRange,
    },
  ];

  return query;
}

function getTaskReportDate(task: any): string {
  const sourceDate = task.executionDate || task.productionDate || task.createdAt;
  return sourceDate ? getAppDateKey(sourceDate) : getAppDateKey();
}

function getUserDisplayName(user: any): string {
  const fullName = [user?.name, user?.lastname].filter(Boolean).join(" ").trim();
  return fullName || user?.userName || user?.id || "";
}

function collectEmployeeIds(tasks: any[]): string[] {
  const employeeIds = new Set<string>();

  tasks.forEach((task) => {
    task.employeeWorkLogs?.forEach((log: any) => {
      const employeeId = String(log?.employee || "").trim();
      if (employeeId) {
        employeeIds.add(employeeId);
      }
    });
  });

  return Array.from(employeeIds);
}

async function getEmployeeNameMap(employeeIds: string[]) {
  if (employeeIds.length === 0) {
    return new Map<string, string>();
  }

  const users = await User.find({
    $or: [
      { id: { $in: employeeIds } },
      { userName: { $in: employeeIds } },
    ],
  })
    .select("id name lastname userName")
    .lean();

  const employeeNameMap = new Map<string, string>();
  users.forEach((user: any) => {
    const displayName = getUserDisplayName(user);
    if (user.id) {
      employeeNameMap.set(user.id, displayName);
    }
    if (user.userName) {
      employeeNameMap.set(user.userName, displayName);
    }
  });

  return employeeNameMap;
}

function buildReportRowsFromTask(
  task: any,
  employeeNameMap = new Map<string, string>(),
): Partial<IReportRow>[] {
  const employeeDurations = new Map<string, number>();
  const fallbackEndTime = task.updatedAt || task.executionDate;

  task.employeeWorkLogs?.forEach((log: any) => {
    const employeeId = String(log?.employee || "").trim();
    if (!employeeId) {
      return;
    }

    const logDurationMs = getLogDurationMs(log, fallbackEndTime);
    if (logDurationMs <= 0) {
      return;
    }

    employeeDurations.set(
      employeeId,
      (employeeDurations.get(employeeId) || 0) + logDurationMs,
    );
  });

  if (employeeDurations.size === 0) {
    return [];
  }

  const productName = task.product?.itemName || "";
  const taskName = task.taskType === "Production"
    ? (productName || "Production Task")
    : (task.taskName || "Task");
  const quantity = task.producedQuantity || task.plannedQuantity || 0;
  const reportDate = getTaskReportDate(task);

  return Array.from(employeeDurations.entries(), ([employeeId, totalMS]) => ({
    date: reportDate,
    task: taskName,
    quantity,
    timeWorked: formatDuration(totalMS),
    bomCost: 0,
    user: employeeNameMap.get(employeeId) || employeeId,
    product: productName,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const tenantId = (session.user as { tenantId?: string | null }).tenantId ?? null;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
    }

    const db = await getDbForTenant(tenantId);
    const { ProductionTask } = getTenantModels(db);

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const tasks = await ProductionTask.find(
      getReportDateQuery(startDate, endDate),
    )
      .populate("product", "itemName")
      .lean();

    const employeeNameMap = await getEmployeeNameMap(collectEmployeeIds(tasks));

    const reports = tasks
      .flatMap((task) => buildReportRowsFromTask(task, employeeNameMap))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));

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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tenantId = (session.user as { tenantId?: string | null }).tenantId ?? null;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
    }

    const db = await getDbForTenant(tenantId);
    const { ProductionTask, ReportRow } = getTenantModels(db);

    const { taskIds } = await request.json() as { taskIds: string[] };

    const tasks = await ProductionTask.find({ _id: { $in: taskIds } })
      .populate("product", "itemName");
    const employeeNameMap = await getEmployeeNameMap(collectEmployeeIds(tasks));

    const reportPromises = tasks.map(async (task: any) => {
      if (task.taskType !== "Production") return null;

      const rowsToCreate = buildReportRowsFromTask(task, employeeNameMap);

      if (rowsToCreate.length === 0) {
        return null;
      }

      return ReportRow.create(rowsToCreate);
    });

    const reportRows = await Promise.all(reportPromises);
    // Filter out null rows and flatten the created documents array.
    const filteredRows = reportRows.flatMap((row) => (row ? row : []));

    return NextResponse.json({ message: "Report generated", report: filteredRows }, { status: 200 });
  } catch (error: any) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
