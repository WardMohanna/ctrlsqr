import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/db";
import ProductionTask from "@/models/ProductionTask";
import InventoryItem from "@/models/Inventory";

export async function GET() {
  try {
    await connectMongo();

    // Debug: Check all unique status values in the database
    const allStatuses = await ProductionTask.distinct("status");
    console.log("All statuses in database:", allStatuses);

    // Count production tasks by status
    const openTasks = await ProductionTask.countDocuments({ status: "Pending" });
    const inProgressTasks = await ProductionTask.countDocuments({ status: "InProgress" });
    const completedTasks = await ProductionTask.countDocuments({ status: "Completed" });

    console.log("Task counts - Pending:", openTasks, "InProgress:", inProgressTasks, "Completed:", completedTasks);

    // Count low stock items (where quantity <= minQuantity)
    const lowStockCount = await InventoryItem.countDocuments({
      $expr: { $lte: ["$quantity", "$minQuantity"] }
    });

    // Calculate total inventory value (quantity * currentCostPrice)
    const inventoryItems = await InventoryItem.find({}, { quantity: 1, currentCostPrice: 1 });
    const totalInventoryValue = inventoryItems.reduce((sum, item) => {
      return sum + (item.quantity * (item.currentCostPrice || 0));
    }, 0);

    return NextResponse.json({
      tasks: {
        open: openTasks,
        inProgress: inProgressTasks,
        completed: completedTasks
      },
      lowStockCount: lowStockCount,
      inventory: {
        totalValue: totalInventoryValue
      },
      invoicesThisWeek: {
        totalNis: totalInventoryValue // Placeholder - you may want to calculate actual weekly invoices
      }
    });
  } catch (error: any) {
    console.error("Error fetching KPIs:", error);
    return NextResponse.json({ error: "Failed to fetch KPIs" }, { status: 500 });
  }
}
