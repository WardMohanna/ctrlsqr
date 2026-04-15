import { NextResponse, NextRequest } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions"; // Adjust the path as needed
import ProductionTask from "@/models/ProductionTask";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";
import { validateRawMaterials } from "@/lib/validateRawMaterials";
import { buildBomSnapshotFromProduct } from "@/lib/productionTaskBom";
import { getDefaultEpicIdForTaskType } from "@/lib/defaultEpics";
import {
  classifyTodayColumn,
  parseLocalDateKey,
  type TaskBoardLike,
} from "@/lib/productionBoard";
import User from "@/models/User";
import {
  enrichSingleTaskWithUsers,
  validateUserIdsExist,
} from "@/lib/productionTaskPeople";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

// We keep your context type, though ideally it should be { params: { id: string } } (not a Promise)
interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectMongo();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = session.user.id || session.user.email;

    // Await the parameters (as your context is defined as a Promise)
    const { id } = await context.params;
    const body = await request.json();
    const { action } = body;

    const task = await ProductionTask.findById(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Helper function: finish an active log by setting its endTime and calculating accumulatedDuration.
    function finishLog(activeLog: any) {
      const currentTime = new Date();
      activeLog.endTime = currentTime;
      const startTime = new Date(activeLog.startTime);
      activeLog.accumulatedDuration = currentTime.getTime() - startTime.getTime();
      activeLog.status = "Pending"; // Optionally, mark as finished
    }

    // Function to finalize any active log in any task (other than the current one)
    async function finalizeOtherActiveLogs() {
      const otherActiveTasks = await ProductionTask.find({
        _id: { $ne: id },
        "employeeWorkLogs": { $elemMatch: { employee: userId, endTime: { $in: [null, ""] } } },
      });
      for (const otherTask of otherActiveTasks) {
        let modified = false;
        otherTask.employeeWorkLogs.forEach((log: any) => {
          if ((log.endTime == null || log.endTime === "") && String(log.employee) === userId) {
            finishLog(log);
            modified = true;
          }
        });
        if (modified) {
          await otherTask.save();
        }
      }
    }

    // In "start" and "reopen", we want to finalize any other active logs before opening a new one.
    if (action === "start") {
      await finalizeOtherActiveLogs();

      // Add a new log entry to mark the start of work.
      task.employeeWorkLogs.push({
        employee: userId,
        startTime: new Date(),
        endTime: null,
        laborPercentage: 0,
      });
      task.status = "InProgress";
      await task.save();
      return NextResponse.json({ message: "Task log started" }, { status: 200 });

    } else if (action === "stop") {
      // Finish any active log in the current task.
      const activeLog = task.employeeWorkLogs.find(
        (log: any) =>
          (log.endTime == null || log.endTime === "") &&
          String(log.employee) === userId
      );
      if (activeLog) {
        finishLog(activeLog);
      }
      task.status = "Pending";
      await task.save();
      return NextResponse.json({ message: "Task log stopped" }, { status: 200 });

    } else if (action === "reopen") {
      await finalizeOtherActiveLogs();
      
      // Start a new log session.
      task.employeeWorkLogs.push({
        employee: userId,
        startTime: new Date(),
        endTime: null,
        laborPercentage: 0,
      });
      task.status = "InProgress";
      await task.save();
      return NextResponse.json({ message: "Task log reopened" }, { status: 200 });

    } else if (action === "setQuantities") {
      const produced = body.producedQuantity ?? 0;
      const defected = body.defectedQuantity ?? 0;

      task.producedQuantity = produced;
      task.defectedQuantity = defected;
      await task.save();
      return NextResponse.json({ message: "Quantities updated" }, { status: 200 });

    } else if (action === "unclaim") {
      // Remove this user's work logs from the task.
      task.employeeWorkLogs = task.employeeWorkLogs.filter(
        (log: any) => log.employee !== userId
      );
      if (task.employeeWorkLogs.length === 0) {
        task.status = "Pending";
      }
      await task.save();
      return NextResponse.json({ message: "Task unclaimed successfully" }, { status: 200 });

    } else if (action === "updateDetails") {
      const {
        taskType,
        taskName,
        product,
        plannedQuantity,
        productionDate,
        epicId: epicIdBody,
        isDraft,
        customerName,
        businessCustomerName,
        orderLines,
        orderTotalPrice,
        deliveryDate,
        attachmentUrl,
        attachmentOriginalName,
        attachmentMimeType,
        skipValidation,
        syncEpicToTaskType,
        ownerId: bodyOwnerId,
        assigneeIds: bodyAssigneeIds,
      } = body;

      if (!task.ownerId && task.createdBy) {
        task.ownerId = task.createdBy;
      }

      const role = (session.user as { role?: string }).role;
      const uid = String(session.user.id || session.user.email);
      const isAdmin = role === "admin";
      const isOwner =
        task.ownerId === uid ||
        (!task.ownerId && task.createdBy === uid);

      if (bodyOwnerId !== undefined || bodyAssigneeIds !== undefined) {
        if (isAdmin) {
          if (bodyOwnerId !== undefined) {
            if (typeof bodyOwnerId !== "string" || !bodyOwnerId.trim()) {
              return NextResponse.json({ error: "Invalid ownerId" }, { status: 400 });
            }
            const nextOwner = await User.findOne({ id: bodyOwnerId.trim() }).lean();
            if (!nextOwner) {
              return NextResponse.json({ error: "Unknown user" }, { status: 400 });
            }
            task.ownerId = bodyOwnerId.trim();
          }
          if (bodyAssigneeIds !== undefined) {
            if (!Array.isArray(bodyAssigneeIds)) {
              return NextResponse.json({ error: "Invalid assigneeIds" }, { status: 400 });
            }
            const ids = [
              ...new Set(
                bodyAssigneeIds.map((x: unknown) => String(x)).filter(Boolean),
              ),
            ];
            const ok = await validateUserIdsExist(ids);
            if (!ok) {
              return NextResponse.json({ error: "Unknown assignee" }, { status: 400 });
            }
            task.assigneeIds = ids;
            task.markModified("assigneeIds");
          }
        } else if (isOwner && bodyOwnerId !== undefined) {
          if (bodyAssigneeIds !== undefined) {
            return NextResponse.json(
              { error: "Only managers can change assignees" },
              { status: 403 },
            );
          }
          if (typeof bodyOwnerId !== "string" || !bodyOwnerId.trim()) {
            return NextResponse.json({ error: "Invalid ownerId" }, { status: 400 });
          }
          const nextOwner = await User.findOne({ id: bodyOwnerId.trim() }).lean();
          if (!nextOwner) {
            return NextResponse.json({ error: "Unknown user" }, { status: 400 });
          }
          task.ownerId = bodyOwnerId.trim();
        } else if (bodyOwnerId !== undefined || bodyAssigneeIds !== undefined) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }

      if (taskType !== undefined) {
        task.taskType = taskType;
        if (syncEpicToTaskType === true) {
          const eid = await getDefaultEpicIdForTaskType(String(taskType));
          task.epic = eid;
        }
      } else if (syncEpicToTaskType === true) {
        const eid = await getDefaultEpicIdForTaskType(String(task.taskType));
        task.epic = eid;
      }

      if (taskName !== undefined) task.taskName = String(taskName).trim();

      if (productionDate !== undefined) {
        task.productionDate = new Date(productionDate);
      }

      if (epicIdBody !== undefined && syncEpicToTaskType !== true) {
        if (epicIdBody === null || epicIdBody === "") {
          task.set("epic", null);
        } else if (
          typeof epicIdBody === "string" &&
          mongoose.Types.ObjectId.isValid(epicIdBody)
        ) {
          task.epic = new mongoose.Types.ObjectId(epicIdBody);
        } else {
          return NextResponse.json({ error: "Invalid epicId" }, { status: 400 });
        }
      }

      if (task.taskType === "Production") {
        if (product !== undefined) {
          task.product =
            product && mongoose.Types.ObjectId.isValid(String(product))
              ? new mongoose.Types.ObjectId(String(product))
              : undefined;
        }
        if (plannedQuantity !== undefined) {
          task.plannedQuantity = Number(plannedQuantity);
        }
      }

      if (task.taskType === "CustomerOrder") {
        if (customerName !== undefined) task.customerName = String(customerName).trim();
        if (orderTotalPrice !== undefined) task.orderTotalPrice = Number(orderTotalPrice);
        if (deliveryDate !== undefined) {
          task.deliveryDate = deliveryDate ? new Date(deliveryDate) : undefined;
        }
      }

      if (task.taskType === "BusinessCustomer") {
        if (businessCustomerName !== undefined) {
          task.businessCustomerName = String(businessCustomerName).trim();
        }
      }

      if (
        (task.taskType === "CustomerOrder" || task.taskType === "BusinessCustomer") &&
        Array.isArray(orderLines)
      ) {
        const productIds = orderLines
          .map((line: any) => line?.product ? String(line.product) : "")
          .filter(Boolean);

        const products = productIds.length
          ? await InventoryItem.find({ _id: { $in: productIds } })
              .select("currentClientPrice currentBusinessPrice")
              .lean()
          : [];

        const byId = new Map<string, any>();
        for (const p of products) {
          byId.set(String(p._id), p);
        }

        // Always compute unit price + total from Inventory selling prices.
        const mapped = orderLines.map((line: any) => {
          const pid = String(line.product);
          const quantity = Math.max(0, Number(line.quantity) || 0);
          const dbItem = byId.get(pid);

          const unitPrice =
            task.taskType === "CustomerOrder"
              ? Number(dbItem?.currentClientPrice ?? 0)
              : Number(dbItem?.currentBusinessPrice ?? 0);

          return {
            product: new mongoose.Types.ObjectId(pid),
            quantity,
            unitPrice,
          };
        });

        task.orderLines = mapped as any;
        task.markModified("orderLines");
        task.plannedQuantity = mapped.reduce((s, l) => s + l.quantity, 0);
        task.orderTotalPrice = mapped.reduce(
          (s, l) => s + (l.quantity || 0) * (l.unitPrice || 0),
          0,
        );
        task.markModified("orderTotalPrice");
      }

      if (attachmentUrl !== undefined) task.attachmentUrl = attachmentUrl;
      if (attachmentOriginalName !== undefined) {
        task.attachmentOriginalName = attachmentOriginalName;
      }
      if (attachmentMimeType !== undefined) task.attachmentMimeType = attachmentMimeType;

      const nextDraft = isDraft === true;
      task.isDraft = nextDraft;

      if (!nextDraft) {
        if (task.taskType === "Production") {
          if (!task.product || !task.plannedQuantity || task.plannedQuantity < 1) {
            return NextResponse.json(
              { error: "Production tasks require a product and planned quantity (min 1)." },
              { status: 400 },
            );
          }
          if (!skipValidation) {
            const validation = await validateRawMaterials(
              String(task.product),
              task.plannedQuantity,
            );
            if (validation.requiresConfirmation) {
              return NextResponse.json(
                {
                  validationRequired: true,
                  canProceed: validation.canProceed,
                  issues: validation.issues,
                  requiresConfirmation: validation.requiresConfirmation,
                },
                { status: 200 },
              );
            }
          }
          const bom = await buildBomSnapshotFromProduct(String(task.product));
          task.BOMData = bom as any;
          const invItem = await InventoryItem.findById(task.product);
          const dateStr = task.productionDate
            ? new Date(task.productionDate).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10);
          task.taskName = invItem
            ? `Production Task for ${invItem.itemName} on ${dateStr}`
            : `Production Task on ${dateStr}`;
        } else if (task.taskType === "CustomerOrder") {
          if (!task.customerName?.trim()) {
            return NextResponse.json(
              { error: "Customer name is required." },
              { status: 400 },
            );
          }
          if (!task.orderLines?.length) {
            return NextResponse.json(
              { error: "Add at least one product line." },
              { status: 400 },
            );
          }
          if (task.orderTotalPrice == null || task.orderTotalPrice < 0) {
            return NextResponse.json(
              { error: "Order price is required." },
              { status: 400 },
            );
          }
          if (!task.deliveryDate) {
            return NextResponse.json(
              { error: "Delivery date is required." },
              { status: 400 },
            );
          }
          const d = task.customerName.trim();
          const dd = task.deliveryDate
            ? new Date(task.deliveryDate).toISOString().slice(0, 10)
            : "";
          task.taskName = `Customer order: ${d} (deliver ${dd})`;
        } else if (task.taskType === "BusinessCustomer") {
          if (!task.businessCustomerName?.trim()) {
            return NextResponse.json(
              { error: "Business customer name is required." },
              { status: 400 },
            );
          }
          if (!task.orderLines?.length) {
            return NextResponse.json(
              { error: "Add at least one product line." },
              { status: 400 },
            );
          }
          const bc = task.businessCustomerName.trim();
          task.taskName = `Business order: ${bc}`;
        }
      }

      await task.save();
      const populated = await ProductionTask.findById(task._id)
        .populate("product", "itemName")
        .populate("epic", "title")
        .populate({ path: "orderLines.product", select: "itemName" })
        .lean();
      const enriched = await enrichSingleTaskWithUsers(
        populated as Record<string, unknown>,
      );
      return NextResponse.json({ task: enriched }, { status: 200 });
    } else if (action === "boardMove") {
      const { targetColumn: rawTarget, dateKey, resetWorkedTime } = body as {
        targetColumn?: string;
        dateKey?: string;
        resetWorkedTime?: boolean;
      };
      const valid = ["todo", "inProgress", "readyToFinalize", "done"] as const;
      if (!rawTarget || !valid.includes(rawTarget as (typeof valid)[number])) {
        return NextResponse.json({ error: "Invalid targetColumn" }, { status: 400 });
      }
      let targetColumn = rawTarget as (typeof valid)[number];

      if (typeof dateKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
        const { start } = parseLocalDateKey(dateKey);
        task.productionDate = start;
      }

      const role = (session.user as { role?: string }).role;
      const isAdmin = role === "admin";
      if (targetColumn === "done" && !isAdmin) {
        targetColumn = "readyToFinalize";
      }

      const currentCol = classifyTodayColumn(task as unknown as TaskBoardLike);
      if (targetColumn === currentCol) {
        await task.save();
        return NextResponse.json({ message: "Board updated" }, { status: 200 });
      }

      if (targetColumn === "done" && currentCol !== "readyToFinalize") {
        return NextResponse.json(
          { error: "Task can be moved to done only from ready to finalize" },
          { status: 400 },
        );
      }

      if (targetColumn === "todo") {
        if (currentCol === "readyToFinalize") {
          return NextResponse.json(
            { error: "Task cannot be moved from ready to finalize to todo" },
            { status: 400 },
          );
        }
        if (currentCol === "inProgress" && resetWorkedTime !== true) {
          return NextResponse.json(
            { error: "Moving from in progress to todo requires confirmation" },
            { status: 400 },
          );
        }
        task.status = "Pending";
        task.employeeWorkLogs = [];
        task.markModified("employeeWorkLogs");
        await task.save();
      } else if (targetColumn === "inProgress") {
        await finalizeOtherActiveLogs();
        const hasOpen = task.employeeWorkLogs.some(
          (log: any) => log.endTime == null || log.endTime === "",
        );
        if (!hasOpen) {
          task.employeeWorkLogs.push({
            employee: String(userId),
            startTime: new Date(),
            endTime: null,
            laborPercentage: 0,
          });
        }
        task.status = "InProgress";
        task.markModified("employeeWorkLogs");
        await task.save();
      } else if (targetColumn === "readyToFinalize") {
        task.employeeWorkLogs.forEach((log: any) => {
          if (log.endTime == null || log.endTime === "") {
            finishLog(log);
          }
        });
        task.status = "Pending";
        task.markModified("employeeWorkLogs");
        await task.save();
      } else if (targetColumn === "done") {
        task.employeeWorkLogs.forEach((log: any) => {
          if (log.endTime == null || log.endTime === "") {
            finishLog(log);
          }
        });
        task.status = "Completed";
        task.markModified("employeeWorkLogs");
        await task.save();
      }

      return NextResponse.json({ message: "Board updated" }, { status: 200 });
    } else if (action === "setEpic") {
      const epicId = body.epicId;
      if (epicId === null || epicId === undefined || epicId === "") {
        task.set("epic", null);
      } else if (typeof epicId === "string" && mongoose.Types.ObjectId.isValid(epicId)) {
        task.epic = new mongoose.Types.ObjectId(epicId);
      } else {
        return NextResponse.json({ error: "Invalid epicId" }, { status: 400 });
      }
      await task.save();
      return NextResponse.json({ message: "Epic updated" }, { status: 200 });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error("Error updating task:", error instanceof Error ? error.message : error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    await connectMongo();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if user is an admin
    const userRole = (session.user as any).role || "user";
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Only admins can delete tasks" }, { status: 403 });
    }

    const { id } = await context.params;

    const task = await ProductionTask.findById(id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await ProductionTask.findByIdAndDelete(id);

    return NextResponse.json(
      { message: "Task deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error deleting task:", error instanceof Error ? error.message : error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: "Unknown error" }, { status: 500 });
  }
}
