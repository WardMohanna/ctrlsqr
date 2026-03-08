// File: app/api/production/finalize/route.ts

import { NextRequest, NextResponse } from "next/server";
import ProductionTask from "@/models/ProductionTask";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";

/**
 * Process a single production task: deduct raw materials, add produced quantity,
 * and mark the task as completed.
 */
async function processTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  const task = await ProductionTask.findById(taskId);
  if (!task) {
    return { success: false, error: `Task not found: ${taskId}` };
  }

  if (task.taskType !== "Production") {
    task.status = "Completed";
    await task.save();
    return { success: true };
  }

  const produced = task.producedQuantity ?? 0;
  const defected = task.defectedQuantity ?? 0;
  const totalUnits = produced + defected;

  if (totalUnits <= 0) {
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
    return { success: false, error: `Missing standardBatchWeight for product: ${finalProduct.itemName} (task: ${taskId})` };
  }

  if (!finalProduct.components || finalProduct.components.length === 0) {
    return { success: false, error: `No BOM components found for product: ${finalProduct.itemName} (task: ${taskId})` };
  }

  const componentsToUse = (task.BOMData && task.BOMData.length > 0)
    ? task.BOMData
    : (finalProduct.components || []);

  for (const comp of componentsToUse) {
    const usedPerBatch = comp.quantityUsed ?? 0;
    const componentId = comp.rawMaterial ?? comp.componentId;

    if (!usedPerBatch || usedPerBatch <= 0) {
      continue;
    }

    // Use atomic findOneAndUpdate to avoid write conflicts on shared raw materials
    const unit = await InventoryItem.findById(componentId).select("unit").lean();
    if (!unit) {
      return { success: false, error: `Raw material not found: ${componentId} (task: ${taskId})` };
    }

    let usage = usedPerBatch * totalUnits;
    const unitStr = ((unit as any).unit || '').toString().toLowerCase();
    if (unitStr.includes('kg')) {
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

    // Ensure quantity doesn't go below 0
    await InventoryItem.updateOne(
      { _id: componentId, quantity: { $lt: 0 } },
      { $set: { quantity: 0 } }
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

  task.status = "Completed";
  await task.save();
  return { success: true };
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const { taskIds } = await req.json();

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: "No tasks provided for finalization" },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    const successfulTasks: string[] = [];

    // Process each task independently to avoid write conflicts
    // when multiple tasks share the same raw materials
    for (const taskId of taskIds) {
      try {
        const result = await processTask(taskId);
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

    // If all tasks failed
    if (successfulTasks.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { 
          error: "All tasks failed to finalize",
          details: errors.slice(0, 5),
          totalErrors: errors.length
        },
        { status: 500 }
      );
    }

    // Return success with warnings if some failed
    if (errors.length > 0) {
      console.warn("Some tasks failed during finalization:", errors);
      return NextResponse.json({
        message: "Tasks finalized with warnings",
        successful: successfulTasks.length,
        failed: errors.length,
        errors: errors.slice(0, 5),
      }, { status: 207 });
    }

    return NextResponse.json({ 
      message: "All tasks finalized successfully",
      successful: successfulTasks.length
    }, { status: 200 });
  } catch (err: any) {
    console.error("Finalization error:", err.message || err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
