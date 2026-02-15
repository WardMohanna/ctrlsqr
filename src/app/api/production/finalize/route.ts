// File: app/api/production/finalize/route.ts

import { NextRequest, NextResponse } from "next/server";
import ProductionTask from "@/models/ProductionTask";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    await connectMongo();

    const { taskIds } = await req.json();

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json(
        { error: "No tasks provided for finalization" },
        { status: 400 }
      );
    }

    const errors: string[] = [];
    const successfulTasks: string[] = [];
    
    for (const taskId of taskIds) {
      try {
        const task = await ProductionTask.findById(taskId).session(session);
        if (!task) {
          errors.push(`Task not found: ${taskId}`);
          continue;
        }

        if (task.taskType !== "Production") {
          task.status = "Completed";
          await task.save({ session });
          successfulTasks.push(taskId);
          continue;
        }
        
        const produced = task.producedQuantity ?? 0;
        const defected = task.defectedQuantity ?? 0;
        const totalUnits = produced + defected;
        
        if (totalUnits <= 0) {
          task.status = "Completed";
          await task.save({ session });
          successfulTasks.push(taskId);
          continue;
        }

        const finalProduct = await InventoryItem.findById(task.product).session(session);
        if (!finalProduct) {
          errors.push(`Final product not found for task: ${taskId}`);
          continue;
        }

        const batchWeight = finalProduct.standardBatchWeight ?? 0;
        if (!batchWeight || batchWeight <= 0) {
          errors.push(`Missing standardBatchWeight for product: ${finalProduct.itemName} (task: ${taskId})`);
          continue;
        }

        if (!finalProduct.components || finalProduct.components.length === 0) {
          errors.push(`No BOM components found for product: ${finalProduct.itemName} (task: ${taskId})`);
          continue;
        }

        const componentsToUse = (task.BOMData && task.BOMData.length > 0)
          ? task.BOMData
          : (finalProduct.components || []);

        for (const comp of componentsToUse) {
          const usedPerBatch = (comp.quantityUsed ?? comp.quantityUsed === 0) ? comp.quantityUsed : (comp.quantityUsed ?? 0);
          const componentId = comp.rawMaterial ?? comp.componentId;

          if (!usedPerBatch || usedPerBatch <= 0) {
            continue;
          }

          const rawMat = await InventoryItem.findById(componentId).session(session);
          if (!rawMat) {
            errors.push(`Raw material not found: ${componentId} (task: ${taskId})`);
            continue;
          }

          let usage = usedPerBatch * totalUnits;

          const unit = (rawMat.unit || '').toString().toLowerCase();
          if (unit.includes('kg')) {
            usage = usage / 1000;
          }

          rawMat.quantity = Math.max(0, rawMat.quantity - usage);

          rawMat.stockHistory.push({
            date: new Date(),
            change: -usage,
            type: "Used",
            batchReference: `ProdTask-${taskId}`,
          });

          await rawMat.save({ session });
        }

        if (produced > 0) {
          finalProduct.quantity += produced;
          finalProduct.stockHistory.push({
            date: new Date(),
            change: produced,
            type: "Produced",
            batchReference: `ProdTask-${taskId}`,
          });
          await finalProduct.save({ session });
        }

        task.status = "Completed";
        await task.save({ session });
        successfulTasks.push(taskId);
      } catch (taskError: any) {
        errors.push(`Error processing task ${taskId}: ${taskError.message}`);
        console.error(`Error processing task ${taskId}:`, taskError);
      }
    }

    // If all tasks failed, abort transaction
    if (successfulTasks.length === 0 && errors.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json(
        { 
          error: "All tasks failed to finalize",
          details: errors.slice(0, 5), // Return first 5 errors
          totalErrors: errors.length
        },
        { status: 500 }
      );
    }

    // Commit transaction if at least some tasks succeeded
    await session.commitTransaction();
    session.endSession();

    // Return success with warnings if some failed
    if (errors.length > 0) {
      console.warn("Some tasks failed during finalization:", errors);
      return NextResponse.json({
        message: "Tasks finalized with warnings",
        successful: successfulTasks.length,
        failed: errors.length,
        errors: errors.slice(0, 5), // Return first 5 errors
      }, { status: 207 }); // 207 Multi-Status
    }

    return NextResponse.json({ 
      message: "All tasks finalized successfully",
      successful: successfulTasks.length
    }, { status: 200 });
  } catch (err: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Finalization error:", err.message || err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
