import { NextResponse, NextRequest } from 'next/server';
import ProductionTask from '@/models/ProductionTask';
import InventoryItem from '@/models/Inventory';
import { connectMongo } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust the path as needed

export async function GET() {
  try {
    await connectMongo();
    // Get tasks that are scheduled for today and further
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tasks = await ProductionTask.find({
      productionDate: { $gte: startOfDay },
      status: { $in: ['Pending', 'InProgress'] },
    }).populate('product', 'itemName');

    return NextResponse.json(tasks, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching production tasks:', error);
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

    const { taskType, product, plannedQuantity, productionDate, taskName: providedTaskName } = data;
    const prodDate = productionDate ? new Date(productionDate) : new Date();
    const dateStr = prodDate.toISOString().slice(0, 10);

    // Set a default task name based on the type
    let taskName = providedTaskName || `${taskType} Task`;

    // Base task data common for both production and constant tasks
    let newTaskData: any = {
      taskType,
      taskName,
      productionDate: prodDate,
      status: 'Pending',
      employeeWorkLogs: [],
    };

    if (taskType === "Production") {
      // For production tasks, both product and plannedQuantity are required
      if (!product || plannedQuantity === undefined) {
        return NextResponse.json(
          {
            error:
              'Missing required fields: product and plannedQuantity are required for production tasks.',
          },
          { status: 400 }
        );
      }

      // Look up the product from inventory to use its itemName in the taskName
      const invItem = await InventoryItem.findById(product);
      if (invItem) {
        taskName = `Production Task for ${invItem.itemName} on ${dateStr}`;
      } else {
        taskName = `Production Task on ${dateStr}`;
      }

      newTaskData = {
        ...newTaskData,
        taskName,
        product,
        plannedQuantity,
        producedQuantity: 0,
        defectedQuantity: 0,
        BOMData: [],
      };
    } else {
      // For constant tasks, we may allow a custom taskName or use the default.
      newTaskData = {
        ...newTaskData,
        taskName,
        // Optional: you might want to add plannedQuantity (or other fields) for constant tasks as needed.
        plannedQuantity: plannedQuantity || 0,
      };
    }

    newTaskData.employeeWorkLogs.push({
      employee: userId,
      startTime: new Date(),
      endTime: null,
      laborPercentage: 0,
    });

    const newTask = new ProductionTask(newTaskData);
    await newTask.save();

    return NextResponse.json(
      { message: 'Task created successfully', task: newTask },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}