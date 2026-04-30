import { NextRequest, NextResponse } from "next/server";
import { getDbForTenant } from "@/lib/db";
import { getTenantModels } from "@/lib/tenantModels";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { IReportRow } from "@/models/Reports";
import { getAppDateKey } from "@/lib/dateTime";

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

async function processTask(
  taskId: string,
  executionDate: Date,
  ProductionTask: any,
  InventoryItem: any,
): Promise<{ success: boolean; error?: string }> {
  const task = await ProductionTask.findById(taskId);
  if (!task) {
    return { success: false, error: `Task not found: ${taskId}` };
  }

  const completionTime = new Date();
  task.employeeWorkLogs?.forEach((log: any) => {
    if (log.endTime == null || log.endTime === "") {
      log.endTime = completionTime;
    }

    if (!log.accumulatedDuration || log.accumulatedDuration <= 0) {
      const startTime = new Date(log.startTime).getTime();
      const endTime = new Date(log.endTime).getTime();

      if (!Number.isNaN(startTime) && !Number.isNaN(endTime) && endTime > startTime) {
        log.accumulatedDuration = endTime - startTime;
      }
    }
  });

  if (task.taskType !== "Production") {
    task.executionDate = executionDate;
    task.status = "Completed";
    await task.save();
    return { success: true };
  }

  const produced = task.producedQuantity ?? 0;
  const defected = task.defectedQuantity ?? 0;
  const totalUnits = produced + defected;
  const planned = task.plannedQuantity ?? 0;

  if (totalUnits !== planned) {
    return {
      success: false,
      error: `Task "${task.taskName || "Unknown"}": Produced (${produced}) + Defected (${defected}) = ${totalUnits}, but expected ${planned}`,
    };
  }

  if (totalUnits <= 0) {
    task.executionDate = executionDate;
    task.status = "Completed";
    await task.save();
    return { success: true };
  }

  const finalProduct = await InventoryItem.findById(task.product);
  if (!finalProduct) {
    return { success: false, error: `Final product not found for task: ${taskId}` };
  }

  const batchWeight = finalProduct.standardBatchWeight ?? 0;
  if (!batchWeight || batchWeight <= 0) {
    return {
      success: false,
      error: `Missing standardBatchWeight for product: ${finalProduct.itemName} (task: ${taskId})`,
    };
  }

  if (!finalProduct.components || finalProduct.components.length === 0) {
    return {
      success: false,
      error: `No BOM components found for product: ${finalProduct.itemName} (task: ${taskId})`,
    };
  }

  const componentsToUse =
    task.BOMData && task.BOMData.length > 0 ? task.BOMData : finalProduct.components || [];

  for (const comp of componentsToUse) {
    const usedPerBatch = comp.quantityUsed ?? 0;
    const componentId = comp.rawMaterial ?? comp.componentId;

    if (!usedPerBatch || usedPerBatch <= 0) {
      continue;
    }

    const unit = await InventoryItem.findById(componentId).select("unit").lean();
    if (!unit) {
      return { success: false, error: `Raw material not found: ${componentId} (task: ${taskId})` };
    }

    let usage = usedPerBatch * totalUnits;
    const unitStr = ((unit as any).unit || "").toString().toLowerCase();
    if (unitStr.includes("kg")) {
      usage = usage / 1000;
    }

    await InventoryItem.findByIdAndUpdate(componentId, {
      $inc: { quantity: -usage },
      $push: {
        stockHistory: {
          date: new Date(),
          change: -usage,
          type: "Used",
          batchReference: `ProdTask-${taskId}`,
        },
      },
    });

    await InventoryItem.updateOne(
      { _id: componentId, quantity: { $lt: 0 } },
      { $set: { quantity: 0 } },
    );
  }

  if (produced > 0) {
    await InventoryItem.findByIdAndUpdate(finalProduct._id, {
      $inc: { quantity: produced },
      $push: {
        stockHistory: {
          date: new Date(),
          change: produced,
          type: "Produced",
          batchReference: `ProdTask-${taskId}`,
        },
      },
    });
  }

  task.executionDate = executionDate;
  task.status = "Completed";
  await task.save();
  return { success: true };
}

async function createEmployeeReportForFinalizedTasks(
  taskIds: string[],
  session: { user: { id?: string; email?: string; name?: string | null } },
  reportDate: string,
  ProductionTask: any,
  EmployeeReport: any,
): Promise<void> {
  const tasks = await ProductionTask.find({ _id: { $in: taskIds } }).populate("product");
  if (tasks.length === 0) return;

  const userId = session.user.id || session.user.email;
  const tasksCompleted = tasks.map((task: any) => {
    const employeeLog = task.employeeWorkLogs?.find(
      (log: any) => log.employee === session.user.id || log.employee === session.user.email,
    );
    const startTime = employeeLog?.startTime ? new Date(employeeLog.startTime) : new Date();
    const endTime = employeeLog?.endTime ? new Date(employeeLog.endTime) : new Date();
    const timeWorked = employeeLog?.accumulatedDuration || 0;

    return {
      taskId: String(task._id),
      taskName: task.taskName || task.product?.itemName || "Unknown Task",
      productName: task.product?.itemName,
      quantityProduced: task.producedQuantity || 0,
      quantityDefected: task.defectedQuantity || 0,
      timeWorked,
      startTime,
      endTime,
    };
  });

  const totalTimeWorked = tasksCompleted.reduce(
    (sum: number, task: { timeWorked: number }) => sum + task.timeWorked,
    0,
  );

  await EmployeeReport.create({
    employeeId: userId,
    employeeName: session.user.name || session.user.email,
    date: reportDate,
    status: "pending",
    tasksCompleted,
    totalTimeWorked,
  });
}

async function createReportRowsForFinalizedTasks(
  taskIds: string[],
  userId: string,
  ProductionTask: any,
  ReportRow: any,
): Promise<void> {
  const tasks = await ProductionTask.find({ _id: { $in: taskIds } }).populate("product", "itemName");
  const rows: Partial<IReportRow>[] = [];

  for (const task of tasks as any[]) {
    if (task.taskType !== "Production") continue;

    let totalMS = 0;
    task.employeeWorkLogs.forEach((log: any) => {
      if (String(log.employee) === userId && log.endTime) {
        const start = new Date(log.startTime).getTime();
        const end = new Date(log.endTime).getTime();
        totalMS += end - start;
      }
    });

    const reportSourceDate = task.executionDate || task.productionDate;
    const reportDate = reportSourceDate
      ? new Date(reportSourceDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    rows.push({
      date: reportDate,
      task: task.product?.itemName || "Production Task",
      quantity: task.producedQuantity || task.plannedQuantity,
      timeWorked: formatDuration(totalMS),
      bomCost: 0,
      user: userId || "",
      product: task.product?.itemName || "",
    });
  }

  if (rows.length > 0) {
    await ReportRow.insertMany(rows);
  }
}

export async function POST(req: NextRequest) {
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
    const { ProductionTask, InventoryItem, ReportRow, EmployeeReport } = getTenantModels(db);

    const { taskIds, executionDate } = await req.json();

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json({ error: "No tasks provided for finalization" }, { status: 400 });
    }

    const role = String((session.user as { role?: string }).role || "").toLowerCase();
    const isAdmin = role === "admin";
    const uid = String(session.user.id || session.user.email || "");

    if (!isAdmin) {
      const ownable = await ProductionTask.find({ _id: { $in: taskIds } })
        .select("_id ownerId createdBy")
        .lean();
      const denied = ownable.some(
        (t: any) => !(t.ownerId === uid || (!t.ownerId && t.createdBy === uid)),
      );
      if (denied) {
        return NextResponse.json(
          { error: "Only admin or task owner can finalize tasks" },
          { status: 403 },
        );
      }
    }

    const executionDateString =
      typeof executionDate === "string" && executionDate.trim().length > 0
        ? executionDate
        : getAppDateKey();
    const parsedExecutionDate = new Date(executionDateString);

    if (Number.isNaN(parsedExecutionDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid executionDate format. Expected YYYY-MM-DD." },
        { status: 400 },
      );
    }

    const errors: string[] = [];
    const successfulTasks: string[] = [];

    for (const taskId of taskIds) {
      try {
        const result = await processTask(taskId, parsedExecutionDate, ProductionTask, InventoryItem);
        if (result.success) {
          successfulTasks.push(taskId);
        } else if (result.error) {
          errors.push(result.error);
        }
      } catch (taskError: any) {
        errors.push(`Error processing task ${taskId}: ${taskError.message}`);
        console.error(`Error processing task ${taskId}:`, taskError);
      }
    }

    if (successfulTasks.length === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          error: "All tasks failed to finalize",
          details: errors.slice(0, 5),
          totalErrors: errors.length,
        },
        { status: 500 },
      );
    }

    try {
      const reportDate = executionDateString;
      if (role === "employee") {
        await createEmployeeReportForFinalizedTasks(
          successfulTasks,
          {
            user: {
              id: session.user.id,
              email: session.user.email ?? undefined,
              name: session.user.name,
            },
          },
          reportDate,
          ProductionTask,
          EmployeeReport,
        );
      } else {
        const userId = session.user.id || session.user.email;
        await createReportRowsForFinalizedTasks(
          successfulTasks,
          String(userId || ""),
          ProductionTask,
          ReportRow,
        );
      }
    } catch (reportError: any) {
      const msg = `Report generation failed after finalize: ${reportError?.message || "Unknown error"}`;
      errors.push(msg);
      console.error(msg, reportError);
    }

    if (errors.length > 0) {
      console.warn("Some tasks failed during finalization:", errors);
      return NextResponse.json(
        {
          message: "Tasks finalized with warnings",
          successful: successfulTasks.length,
          failed: errors.length,
          errors: errors.slice(0, 5),
        },
        { status: 207 },
      );
    }

    return NextResponse.json(
      {
        message: "All tasks finalized successfully",
        successful: successfulTasks.length,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Finalization error:", err.message || err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
