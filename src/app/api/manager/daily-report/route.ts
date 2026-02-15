import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/lib/db";
import ProductionTask from "@/models/ProductionTask";
import InventoryItem from "@/models/Inventory";
import ReportRow from "@/models/Reports";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";

interface MaterialUsed {
  materialName: string;
  quantityUsed: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
}

interface ProductProduced {
  productName: string;
  quantityProduced: number;
  quantityDefected: number;
  materialsUsed: MaterialUsed[];
  totalMaterialCost: number;
  productValue: number; // Based on client price
  grossProfit: number;
  grossProfitPercentage: number;
}

interface DailyReport {
  date: string;
  productsProduced: ProductProduced[];
  totalMaterialCost: number;
  totalProductValue: number;
  totalGrossProfit: number;
  overallGrossProfitPercentage: number;
}

export async function GET(request: NextRequest) {
  try {
    await connectMongo();

    // Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Parse date parameter (default to today)
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");
    const reportDate = dateParam || new Date().toISOString().slice(0, 10);

    // Find all report rows for the specified date
    const reportRows = await ReportRow.find({ date: reportDate });
    
    if (!reportRows || reportRows.length === 0) {
      // Return empty report
      return NextResponse.json({
        date: reportDate,
        productsProduced: [],
        totalMaterialCost: 0,
        totalProductValue: 0,
        totalGrossProfit: 0,
        overallGrossProfitPercentage: 0,
      }, { status: 200 });
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

    // Process each product group
    for (const [productName, rows] of productReportsMap.entries()) {
      // Find the product in inventory to get BOM and pricing
      const product = await InventoryItem.findOne({ itemName: productName });
      if (!product) continue;

      // Sum quantities from report rows for this product on this date
      const totalProduced = rows.reduce((sum, row) => sum + (row.quantity || 0), 0);
      
      // For defected quantity, we need to check the actual tasks
      // Get task IDs or find tasks by product
      const tasks = await ProductionTask.find({
        product: product._id,
        status: "Completed",
        taskType: "Production",
      });

      // Filter tasks to only those that have reports on this date
      const tasksOnDate = tasks.filter(task => 
        rows.some(row => row.task === productName || row.product === productName)
      );

      const totalDefected = tasksOnDate.reduce((sum, task) => sum + (task.defectedQuantity || 0), 0);
      const totalUnits = totalProduced + totalDefected;

      if (totalUnits === 0) continue;

      // Get BOM data from first matching task or product
      const sampleTask = tasksOnDate[0];
      const componentsToUse = (sampleTask?.BOMData && sampleTask.BOMData.length > 0)
        ? sampleTask.BOMData
        : (product.components || []);

      const materialsUsed: MaterialUsed[] = [];
      let totalMaterialCost = 0;

      for (const comp of componentsToUse) {
        const usedPerBatch = comp.quantityUsed || 0;
        const componentId = comp.rawMaterial || comp.componentId;

        if (!usedPerBatch || usedPerBatch <= 0) continue;

        const rawMat = await InventoryItem.findById(componentId);
        if (!rawMat) continue;

        let usage = usedPerBatch * totalUnits;
        const unit = (rawMat.unit || '').toString().toLowerCase();
        
        // Normalize to display units
        let displayUsage = usage;
        let displayUnit = "g";
        if (unit.includes('kg')) {
          displayUsage = usage / 1000;
          displayUnit = "kg";
        }

        const costPerGram = (rawMat.currentCostPrice || 0) / (unit.includes('kg') ? 1000 : 1);
        const materialCost = usage * costPerGram;

        materialsUsed.push({
          materialName: rawMat.itemName,
          quantityUsed: displayUsage,
          unit: displayUnit,
          costPerUnit: rawMat.currentCostPrice || 0,
          totalCost: materialCost,
        });

        totalMaterialCost += materialCost;
      }

      // Calculate product value (using client price)
      const productValue = totalProduced * (product.currentClientPrice || 0);
      const grossProfit = productValue - totalMaterialCost;
      const grossProfitPercentage = productValue > 0 ? (grossProfit / productValue) * 100 : 0;

      productsMap.set(product._id.toString(), {
        productName: product.itemName,
        quantityProduced: totalProduced,
        quantityDefected: totalDefected,
        materialsUsed,
        totalMaterialCost,
        productValue,
        grossProfit,
        grossProfitPercentage,
      });
    }

    const productsProduced = Array.from(productsMap.values());

    // Calculate totals
    const totalMaterialCost = productsProduced.reduce((sum, p) => sum + p.totalMaterialCost, 0);
    const totalProductValue = productsProduced.reduce((sum, p) => sum + p.productValue, 0);
    const totalGrossProfit = totalProductValue - totalMaterialCost;
    const overallGrossProfitPercentage = totalProductValue > 0
      ? (totalGrossProfit / totalProductValue) * 100
      : 0;

    const report: DailyReport = {
      date: reportDate,
      productsProduced,
      totalMaterialCost,
      totalProductValue,
      totalGrossProfit,
      overallGrossProfitPercentage,
    };

    return NextResponse.json(report, { status: 200 });
  } catch (error: any) {
    console.error("Error generating daily report:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
