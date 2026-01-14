import { NextResponse, NextRequest } from 'next/server';
import ProductionTask from '@/models/ProductionTask';
import InventoryItem from '@/models/Inventory';
import { connectMongo } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
 // Adjust the path as needed
                              
 export async function GET() {
  try {
    await connectMongo();

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // three days ago at midnight
    const threeDaysAgo = new Date(startOfToday);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // gather tasks from the last 3 days (inclusive) OR today+future,
    // but only if status is Pending or InProgress
    const tasks = await ProductionTask.find({
      productionDate: { $gte: threeDaysAgo },
      status: { $in: ["Pending", "InProgress"] },
    }).populate("product", "itemName");

    return NextResponse.json(tasks, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching production tasks:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
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

    function finishLog(activeLog: any) {
      const currentTime = new Date();
      activeLog.endTime = currentTime;
      const startTime = new Date(activeLog.startTime);
      activeLog.accumulatedDuration = currentTime.getTime() - startTime.getTime();
      activeLog.status = "Pending"; // Optionally, mark as finished
    }

    async function finalizeOtherActiveLogs() {
      const openTasks = await ProductionTask.find({
        employeeWorkLogs: {
          $elemMatch: { employee: userId, endTime: { $in: [null, undefined, ""] } }
        }
      });
          for (const otherTask of openTasks) {
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

    

    const { taskType, product, plannedQuantity, productionDate, taskName: providedTaskName } = data;
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

    if (taskType === "Production") {
      // For production tasks, both product and plannedQuantity are required.
      if (!product || plannedQuantity === undefined) {
        return NextResponse.json(
          { error: "Missing required fields: product and plannedQuantity are required for production tasks." },
          { status: 400 }
        );
      }

      // Look up the product from inventory to use its itemName in the taskName.
      const invItem = await InventoryItem.findById(product);
      if (invItem) {
        taskName = `Production Task for ${invItem.itemName} on ${dateStr}`;
      } else {
        taskName = `Production Task on ${dateStr}`;
      }

      // Snapshot the product BOM into the task so changes to the product
      // later won't affect this task's consumption calculation.
      let bomSnapshot: any[] = [];
      try {
        const inv = await InventoryItem.findById(product).lean();
        if (inv && inv.components && Array.isArray(inv.components)) {
          bomSnapshot = inv.components.map((c: any) => ({
            rawMaterial: c.componentId,
            quantityUsed: c.quantityUsed ?? 0,
          }));
        }
      } catch (err) {
        console.warn('Could not snapshot BOM for task creation', err);
      }

      newTaskData = {
        ...newTaskData,
        taskName,
        product,
        plannedQuantity,
        producedQuantity: 0,
        defectedQuantity: 0,
        BOMData: bomSnapshot,
      };
    } else {
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
    }

    // Create and save the new task document.
    const newTask = new ProductionTask(newTaskData);
    await newTask.save();

    return NextResponse.json(
      { message: "Task created successfully", task: newTask },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}