import ProductionTask from "@/models/ProductionTask";
import InventoryItem from "@/models/Inventory";
import ReportRow from "@/models/Reports";
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
 */
export async function calculateDailyReport(reportDate: string): Promise<DailyReportData> {
  // Find all report rows for the specified date
  const reportRows = await ReportRow.find({ date: reportDate });

  const emptyReport: DailyReportData = {
    date: reportDate,
    productsProduced: [],
    totalMaterialCost: 0,
    totalProductValue: 0,
    totalGrossProfit: 0,
    overallGrossProfitPercentage: 0,
  };

  if (!reportRows || reportRows.length === 0) {
    return emptyReport;
  }

  // Group report rows by product
  const productReportsMap = new Map<string, typeof reportRows>();
  for (const row of reportRows) {
    if (!row.product) continue;
    if (!productReportsMap.has(row.product)) {
      productReportsMap.set(row.product, []);
    }
    productReportsMap.get(row.product)!.push(row);
  }

  const productsMap = new Map<string, ProductProduced>();

  // Build date range for the target day
  const dayStart = new Date(reportDate + "T00:00:00.000Z");
  const dayEnd = new Date(reportDate + "T23:59:59.999Z");

  // Process each product group
  for (const [productName, rows] of productReportsMap.entries()) {
    try {
      const product = await InventoryItem.findOne({ itemName: productName });
      if (!product) continue;

      const totalProduced = rows.reduce((sum, row) => sum + (row.quantity || 0), 0);

      // Find production tasks for this product completed on this specific date
      const tasksOnDate = await ProductionTask.find({
        product: product._id,
        status: "Completed",
        taskType: "Production",
        productionDate: { $gte: dayStart, $lte: dayEnd },
      });

      const totalDefected = tasksOnDate.reduce((sum, task) => sum + (task.defectedQuantity || 0), 0);
      const totalUnits = totalProduced + totalDefected;

      if (totalUnits === 0) continue;

      // Get BOM data from first matching task or product
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

          const rawMat = await InventoryItem.findById(componentId);
          if (!rawMat) continue;

          const usage = usedPerBatch * totalUnits;
          const unit = rawMat.unit || "";

          const { displayAmount, displayUnit } = getDisplayUsage(unit, usage);
          const materialCost = calculateCostByUnit(unit, rawMat.currentCostPrice || 0, usage);

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
          console.error(`Error processing component for ${productName}:`, compError);
          continue;
        }
      }

      const productValue = totalProduced * (product.currentClientPrice || 0);
      const grossProfit = productValue - totalMaterialCost;
      const grossProfitPercentage = productValue > 0 ? (grossProfit / productValue) * 100 : 0;

      productsMap.set(product._id.toString(), {
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
      console.error(`Error processing product "${productName}":`, productError);
      continue;
    }
  }

  const productsProduced = Array.from(productsMap.values());

  const totalMaterialCost = productsProduced.reduce((sum, p) => sum + (p.totalMaterialCost || 0), 0);
  const totalProductValue = productsProduced.reduce((sum, p) => sum + (p.productValue || 0), 0);
  const totalGrossProfit = totalProductValue - totalMaterialCost;
  const overallGrossProfitPercentage =
    totalProductValue > 0 ? (totalGrossProfit / totalProductValue) * 100 : 0;

  return {
    date: reportDate,
    productsProduced,
    totalMaterialCost: isFinite(totalMaterialCost) ? totalMaterialCost : 0,
    totalProductValue: isFinite(totalProductValue) ? totalProductValue : 0,
    totalGrossProfit: isFinite(totalGrossProfit) ? totalGrossProfit : 0,
    overallGrossProfitPercentage: isFinite(overallGrossProfitPercentage) ? overallGrossProfitPercentage : 0,
  };
}
