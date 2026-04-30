import { Connection } from "mongoose";
import User from "@/models/User";
import { getTenantModels } from "@/lib/tenantModels";
import { calculateCostByUnit, getDisplayUsage } from "@/lib/costUtils";
import { getAppDateRange } from "@/lib/dateTime";

export interface MaterialUsed {
  materialName: string;
  quantityUsed: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

export interface ProductProduced {
  productName: string;
  quantityProduced: number;
  quantityDefected: number;
  materialsUsed: MaterialUsed[];
  totalMaterialCost: number;
  productValue: number;
  grossProfit: number;
  grossProfitPercentage: number;
}

export interface DailyReportData {
  date: string;
  productsProduced: ProductProduced[];
  totalMaterialCost: number;
  totalProductValue: number;
  totalWorkerCost: number;
  totalGrossProfit: number;
  overallGrossProfitPercentage: number;
}

export async function calculateDailyReport(
  reportDate: string,
  db: Connection,
): Promise<DailyReportData> {
  const { ProductionTask, InventoryItem } = getTenantModels(db);
  const emptyReport: DailyReportData = {
    date: reportDate,
    productsProduced: [],
    totalMaterialCost: 0,
    totalProductValue: 0,
    totalWorkerCost: 0,
    totalGrossProfit: 0,
    overallGrossProfitPercentage: 0,
  };

  const { start: dayStart, end: dayEnd } = getAppDateRange(reportDate);

  const allTasksOnDate = await ProductionTask.find({
    status: "Completed",
    taskType: "Production",
    $or: [
      { executionDate: { $gte: dayStart, $lte: dayEnd } },
      {
        executionDate: { $exists: false },
        productionDate: { $gte: dayStart, $lte: dayEnd },
      },
      {
        executionDate: null,
        productionDate: { $gte: dayStart, $lte: dayEnd },
      },
    ],
  }).lean();

  if (!allTasksOnDate || allTasksOnDate.length === 0) {
    return emptyReport;
  }

  const allUsers = await User.find({ tenantId: db.name }).lean();
  const userById = new Map<string, any>();
  for (const u of allUsers) {
    userById.set((u as any).id, u);
  }

  const tasksByProductId = new Map<string, any[]>();
  for (const task of allTasksOnDate) {
    const pid = task.product?.toString();
    if (!pid) continue;
    if (!tasksByProductId.has(pid)) {
      tasksByProductId.set(pid, []);
    }
    tasksByProductId.get(pid)!.push(task);
  }

  const productIds = Array.from(tasksByProductId.keys());
  if (productIds.length === 0) {
    return emptyReport;
  }

  const productItems = await InventoryItem.find({ _id: { $in: productIds } }).lean();
  const productById = new Map<string, any>();
  for (const p of productItems) {
    productById.set((p as any)._id.toString(), p);
  }

  const rawMaterialIds = new Set<string>();
  for (const [pid, tasksOnDate] of tasksByProductId.entries()) {
    const product = productById.get(pid);
    if (!product) continue;

    const sampleTask = tasksOnDate.length > 0 ? tasksOnDate[0] : null;
    const componentsToUse =
      sampleTask?.BOMData && sampleTask.BOMData.length > 0
        ? sampleTask.BOMData
        : product.components || [];

    for (const comp of componentsToUse) {
      const componentId = comp.rawMaterial || comp.componentId;
      if (componentId) rawMaterialIds.add(componentId.toString());
    }
  }

  const rawMaterialItems =
    rawMaterialIds.size > 0
      ? await InventoryItem.find({ _id: { $in: Array.from(rawMaterialIds) } }).lean()
      : [];

  const rawMatById = new Map<string, any>();
  for (const rm of rawMaterialItems) {
    rawMatById.set((rm as any)._id.toString(), rm);
  }

  let totalWorkerCost = 0;
  for (const task of allTasksOnDate) {
    if (!task.employeeWorkLogs || task.employeeWorkLogs.length === 0) continue;

    for (const log of task.employeeWorkLogs) {
      try {
        const employeeId = log.employee;
        const user = userById.get(employeeId);
        const hourPrice = user?.hourPrice || 0;

        if (hourPrice <= 0) continue;

        const accumulatedDurationMs = log.accumulatedDuration || 0;
        if (accumulatedDurationMs <= 0) continue;

        const accumulatedHours = accumulatedDurationMs / (1000 * 60 * 60);
        const workerCost = accumulatedHours * hourPrice;

        if (isFinite(workerCost) && workerCost > 0) {
          totalWorkerCost += workerCost;
        }
      } catch (logError) {
        console.error("Error calculating worker cost for log:", logError);
      }
    }
  }

  const productsMap = new Map<string, ProductProduced>();

  for (const [pid, tasksOnDate] of tasksByProductId.entries()) {
    try {
      const product = productById.get(pid);
      if (!product) continue;

      const totalProduced = tasksOnDate.reduce(
        (sum, task) => sum + (task.producedQuantity || 0),
        0,
      );
      const totalDefected = tasksOnDate.reduce(
        (sum, task) => sum + (task.defectedQuantity || 0),
        0,
      );
      const totalUnits = totalProduced + totalDefected;

      if (totalUnits === 0) continue;

      const sampleTask = tasksOnDate.length > 0 ? tasksOnDate[0] : null;
      const componentsToUse =
        sampleTask?.BOMData && sampleTask.BOMData.length > 0
          ? sampleTask.BOMData
          : product.components || [];

      const materialsUsed: MaterialUsed[] = [];
      let totalMaterialCost = 0;

      for (const comp of componentsToUse) {
        try {
          const usedPerBatch = comp.quantityUsed || 0;
          const componentId = comp.rawMaterial || comp.componentId;

          if (!usedPerBatch || usedPerBatch <= 0 || !componentId) continue;

          const rawMat = rawMatById.get(componentId.toString());
          if (!rawMat) continue;

          const usage = usedPerBatch * totalUnits;
          const unit = rawMat.unit || "";

          const { displayAmount, displayUnit } = getDisplayUsage(unit, usage);
          const materialCost = calculateCostByUnit(
            unit,
            rawMat.currentCostPrice || 0,
            usage,
          );

          if (!isFinite(materialCost) || !isFinite(displayAmount)) continue;

          materialsUsed.push({
            materialName: rawMat.itemName,
            quantityUsed: displayAmount,
            unit: displayUnit,
            costPerUnit: rawMat.currentCostPrice || 0,
            totalCost: materialCost,
          });

          totalMaterialCost += materialCost;
        } catch (compError) {
          console.error(`Error processing component for ${product.itemName}:`, compError);
        }
      }

      const productValue = totalProduced * (product.currentClientPrice || 0);
      const grossProfit = productValue - totalMaterialCost;
      const grossProfitPercentage =
        productValue > 0 ? (grossProfit / productValue) * 100 : 0;

      productsMap.set(pid, {
        productName: product.itemName,
        quantityProduced: totalProduced,
        quantityDefected: totalDefected,
        materialsUsed,
        totalMaterialCost: isFinite(totalMaterialCost) ? totalMaterialCost : 0,
        productValue: isFinite(productValue) ? productValue : 0,
        grossProfit: isFinite(grossProfit) ? grossProfit : 0,
        grossProfitPercentage: isFinite(grossProfitPercentage) ? grossProfitPercentage : 0,
      });
    } catch (productError) {
      console.error(`Error processing product "${pid}":`, productError);
    }
  }

  const productsProduced = Array.from(productsMap.values());

  const totalMaterialCost = productsProduced.reduce(
    (sum, p) => sum + (p.totalMaterialCost || 0),
    0,
  );
  const totalProductValue = productsProduced.reduce(
    (sum, p) => sum + (p.productValue || 0),
    0,
  );
  const totalGrossProfit = totalProductValue - totalMaterialCost - totalWorkerCost;
  const overallGrossProfitPercentage =
    totalProductValue > 0 ? (totalGrossProfit / totalProductValue) * 100 : 0;

  return {
    date: reportDate,
    productsProduced,
    totalMaterialCost: isFinite(totalMaterialCost) ? totalMaterialCost : 0,
    totalProductValue: isFinite(totalProductValue) ? totalProductValue : 0,
    totalWorkerCost: isFinite(totalWorkerCost) ? totalWorkerCost : 0,
    totalGrossProfit: isFinite(totalGrossProfit) ? totalGrossProfit : 0,
    overallGrossProfitPercentage: isFinite(overallGrossProfitPercentage)
      ? overallGrossProfitPercentage
      : 0,
  };
}
