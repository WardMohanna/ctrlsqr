import { NextResponse, NextRequest } from "next/server";
import mongoose from "mongoose";
import ProductionTask from "@/models/ProductionTask";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { validateRawMaterials } from "@/lib/validateRawMaterials";
import { buildBomSnapshotFromProduct } from "@/lib/productionTaskBom";
import { getDefaultEpicIdForTaskType } from "@/lib/defaultEpics";
import {
  enrichSingleTaskWithUsers,
  resolvePeopleForCreate,
} from "@/lib/productionTaskPeople";

const CONSTANT_TASK_TYPES = [
  "Cleaning",
  "Break",
  "CoffeeshopOpening",
  "Selling",
  "Packaging",
  "Recycling",
] as const;

export async function GET() {
  try {
    await connectMongo();

    // Fetch ALL tasks with status Pending or InProgress, regardless of date
    // This ensures that if a user has claimed old tasks, they will still appear
    // in their task list and can be properly finalized
    const tasks = await ProductionTask.find({
      status: { $in: ["Pending", "InProgress"] },
    }).populate("product", "itemName");

    return NextResponse.json(tasks, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching production tasks:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const data = await req.json();

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    // Use the authenticated user's ID (or email if no id is provided)
    const userId = session.user.id || session.user.email;

    if (data.createDraft === true) {
      const taskType = data.taskType || "Production";
      if (
        !["Production", "CustomerOrder", "BusinessCustomer"].includes(taskType)
      ) {
        return NextResponse.json(
          { error: "Invalid taskType for draft" },
          { status: 400 },
        );
      }
      const prodDate = data.productionDate
        ? new Date(data.productionDate)
        : new Date();
      const epicId = await getDefaultEpicIdForTaskType(taskType);
      let newTaskData: Record<string, unknown> = {
        taskType,
        productionDate: prodDate,
        status: "Pending",
        employeeWorkLogs: [],
        epic: epicId,
        isDraft: true,
      };
      if (taskType === "Production") {
        newTaskData.taskName =
          typeof data.taskName === "string" ? data.taskName : "New task";
        newTaskData.plannedQuantity = 0;
      } else if (taskType === "CustomerOrder") {
        newTaskData.taskName =
          typeof data.taskName === "string"
            ? data.taskName
            : "New customer order";
        newTaskData.customerName = "";
        newTaskData.orderLines = [];
        newTaskData.orderTotalPrice = 0;
        newTaskData.plannedQuantity = 0;
      } else {
        newTaskData.taskName =
          typeof data.taskName === "string"
            ? data.taskName
            : "New business order";
        newTaskData.businessCustomerName = "";
        newTaskData.orderLines = [];
        newTaskData.plannedQuantity = 0;
      }
      const peopleDraft = await resolvePeopleForCreate(session, data);
      if ("error" in peopleDraft) {
        return NextResponse.json({ error: peopleDraft.error }, { status: 400 });
      }
      newTaskData = { ...newTaskData, ...peopleDraft };
      const newTask = new ProductionTask(newTaskData);
      await newTask.save();
      const populated = await ProductionTask.findById(newTask._id)
        .populate("product", "itemName")
        .populate("epic", "title")
        .populate({ path: "orderLines.product", select: "itemName" })
        .lean();
      const enriched = await enrichSingleTaskWithUsers(
        populated as Record<string, unknown>,
      );
      return NextResponse.json(
        { message: "Draft created", task: enriched },
        { status: 201 },
      );
    }

    function finishLog(activeLog: any) {
      const currentTime = new Date();
      activeLog.endTime = currentTime;
      const startTime = new Date(activeLog.startTime);
      activeLog.accumulatedDuration =
        currentTime.getTime() - startTime.getTime();
      activeLog.status = "Pending"; // Optionally, mark as finished
    }

    async function finalizeOtherActiveLogs() {
      const openTasks = await ProductionTask.find({
        employeeWorkLogs: {
          $elemMatch: {
            employee: userId,
            endTime: { $in: [null, undefined, ""] },
          },
        },
      });
      for (const otherTask of openTasks) {
        let modified = false;
        otherTask.employeeWorkLogs.forEach((log: any) => {
          if (
            (log.endTime == null || log.endTime === "") &&
            String(log.employee) === userId
          ) {
            finishLog(log);
            modified = true;
          }
        });
        if (modified) {
          await otherTask.save();
        }
      }
    }

    const {
      taskType,
      product,
      plannedQuantity,
      productionDate,
      taskName: providedTaskName,
      skipValidation,
      epicId: epicIdRaw,
    } = data;
    const prodDate = productionDate ? new Date(productionDate) : new Date();
    const dateStr = prodDate.toISOString().slice(0, 10);

    // Set a default task name based on the task type.
    let taskName = providedTaskName || `${taskType} Task`;

    // Base task data common for both production and constant tasks.
    // By default, we start with no work logs.
    let newTaskData: any = {
      taskType,
      taskName,
      productionDate: prodDate,
      status: "Pending",
      employeeWorkLogs: [],
    };

    if (
      epicIdRaw &&
      typeof epicIdRaw === "string" &&
      mongoose.Types.ObjectId.isValid(epicIdRaw)
    ) {
      newTaskData.epic = new mongoose.Types.ObjectId(epicIdRaw);
    }

    if (taskType === "Production") {
      // For production tasks, both product and plannedQuantity are required.
      if (!product || plannedQuantity === undefined) {
        return NextResponse.json(
          {
            error:
              "Missing required fields: product and plannedQuantity are required for production tasks.",
          },
          { status: 400 },
        );
      }

      // Validate raw material availability (unless skipValidation flag is set)
      if (!skipValidation) {
        const validation = await validateRawMaterials(product, plannedQuantity);

        if (validation.requiresConfirmation) {
          // Return validation results without creating task
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

      // Look up the product from inventory to use its itemName in the taskName.
      const invItem = await InventoryItem.findById(product);
      if (invItem) {
        taskName = `Production Task for ${invItem.itemName} on ${dateStr}`;
      } else {
        taskName = `Production Task on ${dateStr}`;
      }

      const bomSnapshot = await buildBomSnapshotFromProduct(product);

      newTaskData = {
        ...newTaskData,
        taskName,
        product,
        plannedQuantity,
        producedQuantity: 0,
        defectedQuantity: 0,
        BOMData: bomSnapshot,
      };
    } else if (taskType === "CustomerOrder" || taskType === "BusinessCustomer") {
      return NextResponse.json(
        {
          error:
            "Customer and business orders are created from the production board.",
        },
        { status: 400 },
      );
    } else if (CONSTANT_TASK_TYPES.includes(taskType as (typeof CONSTANT_TASK_TYPES)[number])) {
      // For constant tasks:
      // - We allow a custom taskName (or default to `${taskType} Task`).
      // - We add a work log entry automatically for the current user.
      await finalizeOtherActiveLogs();
      newTaskData = {
        ...newTaskData,
        taskName,
        plannedQuantity: plannedQuantity || 0,
        // Add a new work log immediately for this user.
        employeeWorkLogs: [
          {
            employee: userId,
            startTime: new Date(),
            endTime: null,
            laborPercentage: 0,
            accumulatedDuration: 0,
          },
        ],
      };
    } else {
      return NextResponse.json({ error: "Unknown task type" }, { status: 400 });
    }

    const people = await resolvePeopleForCreate(session, data);
    if ("error" in people) {
      return NextResponse.json({ error: people.error }, { status: 400 });
    }
    Object.assign(newTaskData, people);

    // Create and save the new task document.
    const newTask = new ProductionTask(newTaskData);
    await newTask.save();

    return NextResponse.json(
      { message: "Task created successfully", task: newTask },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
