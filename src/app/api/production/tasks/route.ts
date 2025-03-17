import { NextResponse, NextRequest } from 'next/server';
import ProductionTask from '@/models/ProductionTask';
import InventoryItem from '@/models/Inventory';
import { connectMongo } from '@/lib/db';

export async function GET() {
  try {
    await connectMongo();
    // Get tasks that are scheduled for today and are Pending or InProgress
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const tasks = await ProductionTask.find({
      productionDate: { $gte: startOfDay, $lt: endOfDay },
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
    const { product, plannedQuantity, productionDate } = data;
    if (!product || !plannedQuantity) {
      return NextResponse.json(
        { error: 'Missing required fields: product and plannedQuantity are required.' },
        { status: 400 }
      );
    }
    
    const invItem = await InventoryItem.findById(product);
    let taskName = 'Production Task';
    const prodDate = productionDate ? new Date(productionDate) : new Date();
    const dateStr = prodDate.toISOString().slice(0, 10);
    if (invItem) {
      taskName = `Production Task for ${invItem.itemName} on ${dateStr}`;
    }
    
    const newTask = new ProductionTask({
      taskName,
      product,
      plannedQuantity,
      producedQuantity: 0,
      defectedQuantity: 0,
      productionDate: prodDate,
      employeeWorkLogs: [],
      BOMData: [],
      status: 'Pending'
    });
    
    await newTask.save();
    return NextResponse.json(
      { message: 'Production task created successfully', task: newTask },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating production task:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
