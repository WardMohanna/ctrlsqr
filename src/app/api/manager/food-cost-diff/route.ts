import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { connectMongo } from "@/lib/db";
import ProductionTask from "@/models/ProductionTask";
import InventoryItem from "@/models/Inventory";
import Invoice from "@/models/Invoice";
import { calculateCostByUnit } from "@/lib/costUtils";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    );
  }

  const periodStart = new Date(startDate + "T00:00:00.000Z");
  const periodEnd = new Date(endDate + "T23:59:59.999Z");

  await connectMongo();

  // ── Step 1: Estimated cost from completed production BOM ──────────────────
  const tasks = (await ProductionTask.find({
    taskType: "Production",
    status: "Completed",
    $or: [
      { executionDate: { $gte: periodStart, $lte: periodEnd } },
      {
        executionDate: { $exists: false },
        productionDate: { $gte: periodStart, $lte: periodEnd },
      },
      {
        executionDate: null,
        productionDate: { $gte: periodStart, $lte: periodEnd },
      },
    ],
  }).lean()) as any[];

  // Collect raw material IDs referenced in BOM
  const rawMaterialIds = new Set<string>();
  for (const task of tasks) {
    for (const bom of task.BOMData ?? []) {
      if (bom.rawMaterial) rawMaterialIds.add(bom.rawMaterial.toString());
    }
  }

  const matIdArr = Array.from(rawMaterialIds);

  // Batch-fetch all referenced materials (with stockHistory for actual calc)
  const materials = (await InventoryItem.find(
    { _id: { $in: matIdArr } },
    {
      _id: 1,
      itemName: 1,
      sku: 1,
      category: 1,
      unit: 1,
      currentCostPrice: 1,
      quantity: 1,
      stockHistory: 1,
    }
  ).lean()) as any[];

  const materialMap = new Map<string, any>();
  for (const m of materials) {
    materialMap.set(m._id.toString(), m);
  }

  // Accumulate estimated cost per material
  const estimatedMap = new Map<string, number>();

  for (const task of tasks) {
    const totalUnits =
      (task.producedQuantity ?? 0) + (task.defectedQuantity ?? 0);
    for (const bom of task.BOMData ?? []) {
      if (!bom.rawMaterial || !bom.quantityUsed) continue;
      const matId = bom.rawMaterial.toString();
      const mat = materialMap.get(matId);
      if (!mat) continue;
      const cost = calculateCostByUnit(
        mat.unit,
        mat.currentCostPrice,
        bom.quantityUsed * totalUnits
      );
      estimatedMap.set(matId, round((estimatedMap.get(matId) ?? 0) + cost));
    }
  }

  // ── Step 2: Actual cost from stockHistory + invoices ─────────────────────
  // Build opening/closing from stockHistory for each material
  interface ActualEntry {
    openingCost: number;
    purchasedCost: number;
    closingCost: number;
    actualUsedCost: number;
  }
  const actualMap = new Map<string, ActualEntry>();

  for (const mat of materials) {
    const id = mat._id.toString();
    const costPrice = mat.currentCostPrice ?? 0;
    const currentQty = mat.quantity ?? 0;
    const history: any[] = mat.stockHistory ?? [];

    const changesFromStart = history
      .filter((h) => new Date(h.date) >= periodStart)
      .reduce((s, h) => s + (h.change ?? 0), 0);

    const changesAfterEnd = history
      .filter((h) => new Date(h.date) > periodEnd)
      .reduce((s, h) => s + (h.change ?? 0), 0);

    const openingQty = Math.max(currentQty - changesFromStart, 0);
    const closingQty = Math.max(currentQty - changesAfterEnd, 0);

    actualMap.set(id, {
      openingCost: round(openingQty * costPrice),
      purchasedCost: 0,
      closingCost: round(closingQty * costPrice),
      actualUsedCost: 0,
    });
  }

  // Fetch invoice purchases in the period for all items
  const purchaseAgg = (await Invoice.aggregate([
    { $match: { receivedDate: { $gte: periodStart, $lte: periodEnd } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.inventoryItemId",
        purchasedCost: {
          $sum: { $multiply: ["$items.quantity", "$items.cost"] },
        },
      },
    },
  ])) as any[];

  for (const p of purchaseAgg) {
    const id = p._id?.toString();
    if (id && actualMap.has(id)) {
      actualMap.get(id)!.purchasedCost = round(p.purchasedCost);
    }
  }

  // Compute actual used cost for each material
  for (const entry of actualMap.values()) {
    entry.actualUsedCost = round(
      entry.openingCost + entry.purchasedCost - entry.closingCost
    );
  }

  // ── Step 3: Join estimated + actual per material ──────────────────────────
  let totalEstimated = 0;
  let totalActual = 0;

  const items = matIdArr.map((id) => {
    const mat = materialMap.get(id)!;
    const estimatedCost = estimatedMap.get(id) ?? 0;
    const actual = actualMap.get(id);
    const actualUsedCost = actual?.actualUsedCost ?? 0;
    const difference = round(actualUsedCost - estimatedCost);
    const variancePct =
      estimatedCost > 0 ? round((difference / estimatedCost) * 100) : null;

    totalEstimated += estimatedCost;
    totalActual += actualUsedCost;

    return {
      _id: id,
      itemName: mat.itemName,
      sku: mat.sku ?? "",
      category: mat.category ?? "",
      unit: mat.unit ?? "",
      estimatedCost,
      actualUsedCost,
      difference,
      variancePct,
      // Breakdown for tooltip / expandable
      openingCost: actual?.openingCost ?? 0,
      purchasedCost: actual?.purchasedCost ?? 0,
      closingCost: actual?.closingCost ?? 0,
    };
  });

  // Sort by absolute difference descending (biggest variance first)
  items.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));

  const totalDifference = round(totalActual - totalEstimated);

  return NextResponse.json({
    period: { startDate, endDate },
    summary: {
      totalEstimated: round(totalEstimated),
      totalActual: round(totalActual),
      totalDifference,
      variancePct:
        totalEstimated > 0
          ? round((totalDifference / totalEstimated) * 100)
          : 0,
      itemCount: items.length,
      taskCount: tasks.length,
    },
    items,
  });
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
