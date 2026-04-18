import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { getDbForTenant } from "@/lib/db";
import { getTenantModels } from "@/lib/tenantModels";
import { calculateCostByUnit, getDisplayUsage } from "@/lib/costUtils";

type GroupBy = "day" | "week" | "month";

function getPeriodKey(date: Date, groupBy: GroupBy): string {
  const d = new Date(date);
  if (groupBy === "day") {
    return d.toISOString().slice(0, 10);
  }
  if (groupBy === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  // ISO week
  const tmp = new Date(d);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const yearStart = new Date(tmp.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${tmp.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = (session.user as any)?.tenantId as string | null;
  if (!tenantId) return NextResponse.json({ error: "Tenant context required" }, { status: 400 });

  const { searchParams } = req.nextUrl;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const groupBy = (searchParams.get("groupBy") ?? "day") as GroupBy;

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    );
  }

  const start = new Date(startDate + "T00:00:00.000Z");
  const end = new Date(endDate + "T23:59:59.999Z");

  const db = await getDbForTenant(tenantId);
  const { ProductionTask, InventoryItem } = getTenantModels(db);

  // Fetch all completed Production tasks in the date range
  const tasks = (await ProductionTask.find({
    taskType: "Production",
    status: "Completed",
    $or: [
      { executionDate: { $gte: start, $lte: end } },
      {
        executionDate: { $exists: false },
        productionDate: { $gte: start, $lte: end },
      },
      {
        executionDate: null,
        productionDate: { $gte: start, $lte: end },
      },
    ],
  }).lean()) as any[];

  const empty = {
    summary: {
      totalCost: 0,
      totalProduced: 0,
      totalDefected: 0,
      taskCount: 0,
    },
    timeline: [],
    byProduct: [],
  };

  if (tasks.length === 0) return NextResponse.json(empty);

  // Collect unique product IDs and raw material IDs
  const productIds = new Set<string>();
  const rawMaterialIds = new Set<string>();

  for (const task of tasks) {
    if (task.product) productIds.add(task.product.toString());
    for (const bom of task.BOMData ?? []) {
      if (bom.rawMaterial) rawMaterialIds.add(bom.rawMaterial.toString());
    }
  }

  // Batch fetch product names + raw materials in parallel
  const [productItems, materials] = await Promise.all([
    InventoryItem.find(
      { _id: { $in: Array.from(productIds) } },
      { _id: 1, itemName: 1 }
    ).lean() as Promise<any[]>,
    InventoryItem.find(
      { _id: { $in: Array.from(rawMaterialIds) } },
      { _id: 1, itemName: 1, currentCostPrice: 1, unit: 1 }
    ).lean() as Promise<any[]>,
  ]);

  const productNameMap = new Map<string, string>();
  for (const p of productItems) {
    productNameMap.set(p._id.toString(), p.itemName);
  }

  const materialMap = new Map<
    string,
    { itemName: string; currentCostPrice: number; unit: string }
  >();
  for (const m of materials) {
    materialMap.set(m._id.toString(), {
      itemName: m.itemName,
      currentCostPrice: m.currentCostPrice ?? 0,
      unit: m.unit ?? "",
    });
  }

  // Accumulators
  let totalCost = 0;
  let totalProduced = 0;
  let totalDefected = 0;

  const timelineMap = new Map<string, { cost: number; produced: number }>();

  // productId → { productName, totals, materials }
  const productAccMap = new Map<
    string,
    {
      productName: string;
      totalProduced: number;
      totalDefected: number;
      totalCost: number;
      materialAcc: Map<
        string,
        {
          materialName: string;
          usage: number;
          unit: string;
          costPerUnit: number;
          totalCost: number;
        }
      >;
    }
  >();

  for (const task of tasks) {
    const produced = task.producedQuantity ?? 0;
    const defected = task.defectedQuantity ?? 0;
    const totalUnits = produced + defected;

    const productId = task.product?.toString() ?? "unknown";
    const productName =
      productNameMap.get(productId) ?? task.taskName ?? "Unknown";

    const execDate =
      task.executionDate
        ? new Date(task.executionDate)
        : new Date(task.productionDate ?? task.createdAt);
    const periodKey = getPeriodKey(execDate, groupBy);

    let taskCost = 0;

    for (const bom of task.BOMData ?? []) {
      if (!bom.rawMaterial || !bom.quantityUsed) continue;
      const matId = bom.rawMaterial.toString();
      const mat = materialMap.get(matId);
      if (!mat) continue;

      const rawUsage = bom.quantityUsed * totalUnits;
      const cost = calculateCostByUnit(
        mat.unit,
        mat.currentCostPrice,
        rawUsage
      );
      taskCost += cost;

      // Per-product material accumulation
      if (!productAccMap.has(productId)) {
        productAccMap.set(productId, {
          productName,
          totalProduced: 0,
          totalDefected: 0,
          totalCost: 0,
          materialAcc: new Map(),
        });
      }
      const prodAcc = productAccMap.get(productId)!;

      if (!prodAcc.materialAcc.has(matId)) {
        const { displayAmount: dispAmt, displayUnit: dispUnit } =
          getDisplayUsage(mat.unit, rawUsage);
        prodAcc.materialAcc.set(matId, {
          materialName: mat.itemName,
          usage: 0,
          unit: dispUnit,
          costPerUnit: mat.currentCostPrice,
          totalCost: 0,
        });
      }
      const matAcc = prodAcc.materialAcc.get(matId)!;
      const { displayAmount } = getDisplayUsage(mat.unit, rawUsage);
      matAcc.usage += displayAmount;
      matAcc.totalCost += cost;
    }

    // Ensure product entry exists even if BOMData was empty
    if (!productAccMap.has(productId)) {
      productAccMap.set(productId, {
        productName,
        totalProduced: 0,
        totalDefected: 0,
        totalCost: 0,
        materialAcc: new Map(),
      });
    }
    const prodAcc = productAccMap.get(productId)!;
    prodAcc.totalProduced += produced;
    prodAcc.totalDefected += defected;
    prodAcc.totalCost += taskCost;

    // Timeline
    if (!timelineMap.has(periodKey)) {
      timelineMap.set(periodKey, { cost: 0, produced: 0 });
    }
    const tp = timelineMap.get(periodKey)!;
    tp.cost += taskCost;
    tp.produced += produced;

    totalCost += taskCost;
    totalProduced += produced;
    totalDefected += defected;
  }

  const timeline = Array.from(timelineMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({ period, cost: Math.round(v.cost * 100) / 100, produced: v.produced }));

  const byProduct = Array.from(productAccMap.entries())
    .map(([productId, p]) => ({
      productId,
      productName: p.productName,
      totalProduced: p.totalProduced,
      totalDefected: p.totalDefected,
      totalCost: Math.round(p.totalCost * 100) / 100,
      costPerUnit:
        p.totalProduced > 0
          ? Math.round((p.totalCost / p.totalProduced) * 100) / 100
          : 0,
      materials: Array.from(p.materialAcc.values())
        .map((m) => ({
          ...m,
          usage: Math.round(m.usage * 1000) / 1000,
          totalCost: Math.round(m.totalCost * 100) / 100,
        }))
        .sort((a, b) => b.totalCost - a.totalCost),
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  return NextResponse.json({
    summary: {
      totalCost: Math.round(totalCost * 100) / 100,
      totalProduced,
      totalDefected,
      taskCount: tasks.length,
    },
    timeline,
    byProduct,
  });
}
