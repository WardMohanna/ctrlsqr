import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import connectMongo from "@/lib/db";
import User from "@/models/User";
import Log from "@/models/Logs";
import ProductionTask from "@/models/ProductionTask";
import EmployeeReport from "@/models/EmployeeReport";
import Invoice from "@/models/Invoice";
import Sale from "@/models/Sale";
import Supplier from "@/models/Supplier";
import Account from "@/models/Account";
import AuditLog from "@/models/AuditLog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ArchiveItem = {
  id: string;
  source:
    | "system-log"
    | "task-session"
    | "task"
    | "employee-report"
    | "report-review"
    | "invoice"
    | "sale"
    | "supplier"
    | "account"
    | "page-visit";
  category: "production" | "finance" | "crm" | "procurement" | "system";
  title: string;
  description: string;
  userId: string | null;
  userName: string;
  occurredAt: Date;
  status: string;
  referenceId: string;
};

const SOURCE_VALUES: ArchiveItem["source"][] = [
  "system-log",
  "task-session",
  "task",
  "employee-report",
  "report-review",
  "invoice",
  "sale",
  "supplier",
  "account",
  "page-visit",
];

function toStringId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value);
  }
  return "";
}

function formatDuration(ms?: number | null): string {
  if (!ms || ms <= 0) return "0m";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours && minutes) return `${hours}h ${minutes}m`;
  if (hours) return `${hours}h`;
  return `${minutes}m`;
}

function buildDateRange(searchParams: URLSearchParams) {
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (!startDate && !endDate) return null;

  const range: { $gte?: Date; $lte?: Date } = {};
  if (startDate) {
    range.$gte = new Date(`${startDate}T00:00:00.000Z`);
  }
  if (endDate) {
    range.$lte = new Date(`${endDate}T23:59:59.999Z`);
  }
  return range;
}

export async function GET(request: NextRequest) {
  try {
    await connectMongo();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string } | undefined)?.role;
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") || 200), 20),
      500,
    );
    const query = (searchParams.get("query") || "").trim().toLowerCase();
    const selectedSource = searchParams.get("source") || "all";
    const selectedUserId = searchParams.get("userId") || "all";
    const dateRange = buildDateRange(searchParams);

    const [
      users,
      logs,
      tasks,
      employeeReports,
      invoices,
      sales,
      suppliers,
      accounts,
      auditLogs,
    ] = await Promise.all([
      User.find({}, { id: 1, name: 1, lastname: 1, userName: 1 }).lean(),
      Log.find(dateRange ? { startTime: dateRange } : {})
        .sort({ startTime: -1 })
        .limit(limit)
        .lean(),
      ProductionTask.find(dateRange ? { updatedAt: dateRange } : {})
        .populate("product", "itemName")
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean(),
      EmployeeReport.find(dateRange ? { createdAt: dateRange } : {})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Invoice.find(dateRange ? { createdAt: dateRange } : {})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Sale.find(dateRange ? { createdAt: dateRange } : {})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Supplier.find(dateRange ? { createdAt: dateRange } : {})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Account.find(dateRange ? { createdAt: dateRange } : {})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      AuditLog.find(dateRange ? { createdAt: dateRange } : {})
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    const userMap = new Map<string, string>();
    users.forEach((user: any) => {
      const label = [user.name, user.lastname].filter(Boolean).join(" ").trim();
      userMap.set(user.id, label || user.userName || user.id);
    });

    const resolveUserName = (userId?: string | null) => {
      if (!userId) return "System";
      return userMap.get(userId) || userId;
    };

    const archiveItems: ArchiveItem[] = [];

    logs.forEach((log: any) => {
      archiveItems.push({
        id: `log-${toStringId(log._id)}`,
        source: "system-log",
        category: "system",
        title: log.text || "System log",
        description: `${log.type || "log"} • ${formatDuration(log.accumulatedDuration)}`,
        userId: log.userId || null,
        userName: resolveUserName(log.userId),
        occurredAt: log.startTime || log.createdAt,
        status: log.endTime ? "closed" : "active",
        referenceId: toStringId(log._id),
      });
    });

    tasks.forEach((task: any) => {
      const taskTitle =
        task.taskType === "Production"
          ? task.product?.itemName || task.taskName || "Production task"
          : task.taskName || task.taskType || "Task";

      archiveItems.push({
        id: `task-${toStringId(task._id)}`,
        source: "task",
        category: "production",
        title: `Task created: ${taskTitle}`,
        description: `${task.taskType || "Production"} • status ${task.status || "Pending"}`,
        userId: null,
        userName: "System",
        occurredAt: task.createdAt || task.productionDate || task.updatedAt,
        status: task.status || "created",
        referenceId: toStringId(task._id),
      });

      (task.employeeWorkLogs || []).forEach((workLog: any, index: number) => {
        const accumulatedDuration =
          workLog.accumulatedDuration ||
          (workLog.endTime && workLog.startTime
            ? new Date(workLog.endTime).getTime() -
              new Date(workLog.startTime).getTime()
            : 0);

        if (
          dateRange &&
          workLog.startTime &&
          ((dateRange.$gte && new Date(workLog.startTime) < dateRange.$gte) ||
            (dateRange.$lte && new Date(workLog.startTime) > dateRange.$lte))
        ) {
          return;
        }

        archiveItems.push({
          id: `task-session-${toStringId(task._id)}-${index}`,
          source: "task-session",
          category: "production",
          title: `Work session: ${taskTitle}`,
          description: `${task.taskType || "Production"} • ${formatDuration(accumulatedDuration)}`,
          userId: workLog.employee || null,
          userName: resolveUserName(workLog.employee),
          occurredAt: workLog.startTime || task.updatedAt || task.createdAt,
          status: workLog.endTime ? "closed" : "active",
          referenceId: toStringId(task._id),
        });
      });
    });

    employeeReports.forEach((report: any) => {
      archiveItems.push({
        id: `employee-report-${toStringId(report._id)}`,
        source: "employee-report",
        category: "production",
        title: `Employee report: ${report.employeeName}`,
        description: `${report.tasksCompleted?.length || 0} tasks • ${formatDuration(report.totalTimeWorked)}`,
        userId: report.employeeId || null,
        userName: report.employeeName || resolveUserName(report.employeeId),
        occurredAt: report.createdAt,
        status: report.status || "pending",
        referenceId: toStringId(report._id),
      });

      if (report.approvedAt) {
        archiveItems.push({
          id: `report-review-${toStringId(report._id)}`,
          source: "report-review",
          category: "production",
          title: `Report ${report.status}: ${report.employeeName}`,
          description: report.managerNotes || "Manager review recorded",
          userId: report.approvedBy || null,
          userName: resolveUserName(report.approvedBy),
          occurredAt: report.approvedAt,
          status: report.status || "approved",
          referenceId: toStringId(report._id),
        });
      }
    });

    invoices.forEach((invoice: any) => {
      archiveItems.push({
        id: `invoice-${toStringId(invoice._id)}`,
        source: "invoice",
        category: "finance",
        title: `${invoice.documentType || "Invoice"}: ${invoice.documentId}`,
        description: `${invoice.oneTimeSupplier || "Supplier record"} • ${invoice.items?.length || 0} items`,
        userId: null,
        userName: "System",
        occurredAt: invoice.createdAt || invoice.receivedDate || invoice.date,
        status: "recorded",
        referenceId: toStringId(invoice._id),
      });
    });

    sales.forEach((sale: any) => {
      archiveItems.push({
        id: `sale-${toStringId(sale._id)}`,
        source: "sale",
        category: "finance",
        title: `Sale ${sale.saleNumber}`,
        description: `${sale.items?.length || 0} items • total ${sale.finalTotal ?? 0}`,
        userId: null,
        userName: "System",
        occurredAt: sale.createdAt || sale.saleDate,
        status: (sale.status || "confirmed").toLowerCase(),
        referenceId: toStringId(sale._id),
      });
    });

    suppliers.forEach((supplier: any) => {
      archiveItems.push({
        id: `supplier-${toStringId(supplier._id)}`,
        source: "supplier",
        category: "procurement",
        title: `Supplier created: ${supplier.name}`,
        description:
          supplier.contactName ||
          supplier.email ||
          supplier.phone ||
          "Supplier record",
        userId: null,
        userName: "System",
        occurredAt: supplier.createdAt,
        status: "created",
        referenceId: toStringId(supplier._id),
      });
    });

    accounts.forEach((account: any) => {
      archiveItems.push({
        id: `account-${toStringId(account._id)}`,
        source: "account",
        category: "crm",
        title: `Account created: ${account.officialEntityName}`,
        description: `${account.category || "Account"} • ${account.city || "No city"}`,
        userId: null,
        userName: "System",
        occurredAt: account.createdAt,
        status: account.active ? "active" : "inactive",
        referenceId: toStringId(account._id),
      });
    });

    auditLogs.forEach((entry: any) => {
      archiveItems.push({
        id: `page-visit-${toStringId(entry._id)}`,
        source: "page-visit",
        category: "system",
        title: `Page visited: ${entry.path}`,
        description: entry.role ? `Role: ${entry.role}` : "Navigation event",
        userId: entry.userId || null,
        userName: entry.userName || resolveUserName(entry.userId),
        occurredAt: entry.createdAt,
        status: "page_visit",
        referenceId: toStringId(entry._id),
      });
    });

    const filtered = archiveItems
      .filter((item) =>
        selectedSource === "all" ? true : item.source === selectedSource,
      )
      .filter((item) =>
        selectedUserId === "all" ? true : item.userId === selectedUserId,
      )
      .filter((item) => {
        if (!query) return true;
        const haystack = [
          item.source,
          item.category,
          item.title,
          item.description,
          item.userName,
          item.status,
          item.referenceId,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      })
      .sort(
        (left, right) => right.occurredAt.getTime() - left.occurredAt.getTime(),
      );

    const items = filtered.slice(0, limit);
    const userOptions = Array.from(
      new Map(
        filtered
          .filter((item) => item.userId)
          .map((item) => [
            item.userId as string,
            { value: item.userId as string, label: item.userName },
          ]),
      ).values(),
    ).sort((a, b) => a.label.localeCompare(b.label));

    const sourceCounts = SOURCE_VALUES.reduce<Record<string, number>>(
      (acc, source) => {
        acc[source] = filtered.filter((item) => item.source === source).length;
        return acc;
      },
      {},
    );

    return NextResponse.json({
      items,
      summary: {
        total: filtered.length,
        sourceCount: Object.values(sourceCounts).filter((count) => count > 0)
          .length,
        userCount: userOptions.length,
        sourceCounts,
      },
      filters: {
        sources: SOURCE_VALUES,
        users: userOptions,
      },
    });
  } catch (error) {
    console.error("Error fetching activity archive:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity archive" },
      { status: 500 },
    );
  }
}
