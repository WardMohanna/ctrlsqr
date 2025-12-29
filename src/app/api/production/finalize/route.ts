// File: app/api/production/finalize/route.ts

import { NextRequest, NextResponse } from "next/server";
import ProductionTask from "@/models/ProductionTask";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    console.log("🔥 Finalization route triggered ok");
    await connectMongo();

    const { taskIds } = await req.json();
    console.log("📦 Task IDs received:", taskIds);

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return NextResponse.json(
        { error: "No tasks provided for finalization" },
        { status: 400 }
      );
    }
    
    for (const taskId of taskIds) {
      console.log("🔍 Processing task:", taskId);
      const task = await ProductionTask.findById(taskId);
      if (!task) {
        console.warn("⚠️ Task not found:", taskId);
        continue;
      }

      if (task.taskType !== "Production") {
        // For constant tasks, simply mark as Completed.
        task.status = "Completed";
        await task.save();
        console.log("✅ Constant task marked as Completed:", taskId);
        continue;
      }
      
      const produced = task.producedQuantity ?? 0;
      const defected = task.defectedQuantity ?? 0;
      const totalUnits = produced + defected;

      console.log(`✅ Task loaded: ${task.product}, Produced: ${produced}, Defected: ${defected}, TotalUnits: ${totalUnits}`);
      if (totalUnits <= 0) {
        console.log("⏭️ Skipping task with 0 total output.");
        continue;
      }



      const finalProduct = await InventoryItem.findById(task.product);
      if (!finalProduct) {
        console.warn("⚠️ Final product not found:", task.product);
        continue;
      }

      console.log(`🧾 Final product: ${finalProduct.itemName} (BOM: ${finalProduct.components?.length})`);

      const batchWeight = finalProduct.standardBatchWeight ?? 0;
      if (!batchWeight || batchWeight <= 0) {
        console.warn("❌ Missing or invalid standardBatchWeight, skipping...");
        continue;
      }

      if (!finalProduct.components || finalProduct.components.length === 0) {
        console.warn("⚠️ No BOM components found, skipping...");
        continue;
      }

      for (const comp of finalProduct.components) {
        const usedPerBatch = comp.quantityUsed ?? 0;
        const componentId = comp.componentId;

        if (!usedPerBatch || usedPerBatch <= 0) {
          console.log(`⏭️ Skipping component with 0 usage: ${componentId}`);
          continue;
        }

        const rawMat = await InventoryItem.findById(componentId);
        if (!rawMat) {
          console.warn("❌ Raw material not found:", componentId);
          continue;
        }

        const usage = (usedPerBatch * totalUnits);

        console.log(`📉 Deducting ${usage.toFixed(3)} from ${rawMat.itemName} (was ${rawMat.quantity})`);

        rawMat.quantity = Math.max(0, rawMat.quantity - usage);

        rawMat.stockHistory.push({
          date: new Date(),
          change: -usage,
          type: "Used",
          batchReference: `ProdTask-${taskId}`,
        });

        await rawMat.save();
        console.log(`✅ ${rawMat.itemName} saved. New qty: ${rawMat.quantity}`);
      }

      // ✅ Increase final product quantity based on produced units
      if (produced > 0) {
        finalProduct.quantity += produced;
        finalProduct.stockHistory.push({
          date: new Date(),
          change: produced,
          type: "Produced",
          batchReference: `ProdTask-${taskId}`,
        });
        await finalProduct.save();
        console.log(`📦 Final product stock increased by ${produced}. New qty: ${finalProduct.quantity}`);
      }

      task.status = "Completed";
      await task.save();
      console.log("✅ Task marked as Completed:", taskId);
    }

    return NextResponse.json({ message: "Tasks finalized successfully" }, { status: 200 });
  } catch (err: any) {
    console.error("❌ Finalization error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
