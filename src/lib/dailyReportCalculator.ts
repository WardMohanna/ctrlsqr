import { Connection } from "mongoose";
import { getTenantModels } from "@/lib/tenantModels";
import { calculateCostByUnit, getDisplayUsage } from "@/lib/costUtils";

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
  totalGrossProfit: number;
  overallGrossProfitPercentage: number;
}

/**
 * Calculate the daily production report for a given date.
 * This is the core logic extracted so it can be used by both
 * the live GET endpoint and the pre-calculation/save flow.
 *
 * All DB queries are batched upfront to avoid N+1 query issues
 * that cause timeouts on serverless platforms like Vercel.
 */
export async function calculateDailyReport(
  reportDate: string,
  db: Connection,
): Promise<DailyReportData> {
  const { ProductionTask, InventoryItem, ReportRow } = getTenantModels(db);
  const emptyReport: DailyReportData = {
    date: reportDate,
    productsProduced: [],
    totalMaterialCost: 0,
    totalProductValue: 0,
    totalGrossProfit: 0,
    overallGrossProfitPercentage: 0,
  };

  // Build date range for the target day
  const dayStart = new Date(reportDate + "T00:00:00.000Z");
  const dayEnd = new Date(reportDate + "T23:59:59.999Z");

  // --- BATCH QUERY 1: Report rows + all production tasks for the day ---
  const [reportRows, allTasksOnDate] = await Promise.all([
    ReportRow.find({ date: reportDate }).lean(),
    ProductionTask.find({
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
    }).lean(),
  ]);

  if (!reportRows || reportRows.length === 0) {
    return emptyReport;
  }

  // Group report rows by product name
  const productReportsMap = new Map<string, typeof reportRows>();
  for (const row of reportRows) {
    if (!row.product) continue;
    if (!productReportsMap.has(row.product)) {
      productReportsMap.set(row.product, []);
    }
    productReportsMap.get(row.product)!.push(row);
  }

  const productNames = Array.from(productReportsMap.keys());

  // --- BATCH QUERY 2: All product inventory items at once ---
  const productItems = await InventoryItem.find({
    itemName: { $in: productNames },
  }).lean();

  // Build lookup maps
  const productByName = new Map<string, any>();
  for (const p of productItems) {
    productByName.set(p.itemName, p);
  }

  // Group production tasks by product ObjectId
  const tasksByProductId = new Map<string, any[]>();
  for (const task of allTasksOnDate) {
    const pid = task.product?.toString();
    if (!pid) continue;
    if (!tasksByProductId.has(pid)) {
      tasksByProductId.set(pid, []);
    }
    tasksByProductId.get(pid)!.push(task);
  }

  // --- Collect all raw material IDs we'll need ---
  const rawMaterialIds = new Set<string>();
  for (const [productName] of productReportsMap.entries()) {
    const product = productByName.get(productName);
    if (!product) continue;

    const pid = product._id.toString();
    const tasksOnDate = tasksByProductId.get(pid) || [];
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

  // --- BATCH QUERY 3: All raw materials at once ---
  const rawMaterialItems =
    rawMaterialIds.size > 0
      ? await InventoryItem.find({
          _id: { $in: Array.from(rawMaterialIds) },
        }).lean()
      : [];

  const rawMatById = new Map<string, any>();
  for (const rm of rawMaterialItems) {
    rawMatById.set((rm as any)._id.toString(), rm);
  }

  // --- Process each product using in-memory data (no more DB calls) ---
  const productsMap = new Map<string, ProductProduced>();

  for (const [productName, rows] of productReportsMap.entries()) {
    try {
      const product = productByName.get(productName);
      if (!product) continue;

      const pid = product._id.toString();
      const totalProduced = rows.reduce(
        (sum, row) => sum + (row.quantity || 0),
        0,
      );

      const tasksOnDate = tasksByProductId.get(pid) || [];
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
          console.error(
            `Error processing component for ${productName}:`,
            compError,
          );
          continue;
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
        grossProfitPercentage: isFinite(grossProfitPercentage)
          ? grossProfitPercentage
          : 0,
      });
    } catch (productError) {
      console.error(`Error processing product "${productName}":`, productError);
      continue;
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
  const totalGrossProfit = totalProductValue - totalMaterialCost;
  const overallGrossProfitPercentage =
    totalProductValue > 0 ? (totalGrossProfit / totalProductValue) * 100 : 0;

  return {
    date: reportDate,
    productsProduced,
    totalMaterialCost: isFinite(totalMaterialCost) ? totalMaterialCost : 0,
    totalProductValue: isFinite(totalProductValue) ? totalProductValue : 0,
    totalGrossProfit: isFinite(totalGrossProfit) ? totalGrossProfit : 0,
    overallGrossProfitPercentage: isFinite(overallGrossProfitPercentage)
      ? overallGrossProfitPercentage
      : 0,
  };
}
