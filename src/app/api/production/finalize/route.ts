// File: app/api/production/finalize/route.ts

import { NextRequest, NextResponse } from "next/server";
import ProductionTask from "@/models/ProductionTask";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";

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
    
    for (const taskId of taskIds) {
      const task = await ProductionTask.findById(taskId);
      if (!task) {
        console.warn(`Task not found: ${taskId}`);
        continue;
      }

      if (task.taskType !== "Production") {
        task.status = "Completed";
        await task.save();
        continue;
      }
      
      const produced = task.producedQuantity ?? 0;
      const defected = task.defectedQuantity ?? 0;
      const totalUnits = produced + defected;
      
      if (totalUnits <= 0) {
        task.status = "Completed";
        await task.save();
        continue;
      }

      const finalProduct = await InventoryItem.findById(task.product);
      if (!finalProduct) {
        console.warn(`Final product not found: ${task.product}`);
        continue;
      }

      const batchWeight = finalProduct.standardBatchWeight ?? 0;
      if (!batchWeight || batchWeight <= 0) {
        console.warn(`Missing standardBatchWeight for product: ${finalProduct.itemName}`);
        continue;
      }

      if (!finalProduct.components || finalProduct.components.length === 0) {
        console.warn(`No BOM components found for product: ${finalProduct.itemName}`);
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

        const rawMat = await InventoryItem.findById(componentId);
        if (!rawMat) {
          console.warn(`Raw material not found: ${componentId}`);
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

        await rawMat.save();
      }

      if (produced > 0) {
        finalProduct.quantity += produced;
        finalProduct.stockHistory.push({
          date: new Date(),
          change: produced,
          type: "Produced",
          batchReference: `ProdTask-${taskId}`,
        });
        await finalProduct.save();
      }

      task.status = "Completed";
      await task.save();
    }

    return NextResponse.json({ message: "Tasks finalized successfully" }, { status: 200 });
  } catch (err: any) {
    console.error("Finalization error:", err.message || err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
