import { NextResponse, NextRequest } from 'next/server';
import ProductionTask from '@/models/ProductionTask';
import InventoryItem from '@/models/Inventory';
import { connectMongo } from '@/lib/db';

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

    const { taskType, product, plannedQuantity, productionDate } = data;
    const prodDate = productionDate ? new Date(productionDate) : new Date();
    const dateStr = prodDate.toISOString().slice(0, 10);

    let taskName = `${taskType} Task`;
    let newTaskData: any = {
      taskType,
      taskName,
      productionDate: prodDate,
      status: 'Pending',
      employeeWorkLogs: [],
    };

    if (taskType === "Production") {
      if (!product || !plannedQuantity) {
        return NextResponse.json(
          { error: 'Missing required fields: product and plannedQuantity are required for production tasks.' },
          { status: 400 }
        );
      }

      const invItem = await InventoryItem.findById(product);
      if (invItem) {
        taskName = `Production Task for ${invItem.itemName} on ${dateStr}`;
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
    }

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
