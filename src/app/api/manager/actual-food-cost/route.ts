import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { connectMongo } from "@/lib/db";
import InventoryItem from "@/models/Inventory";
import Invoice from "@/models/Invoice";

const ALLOWED_CATEGORIES = [
  "ProductionRawMaterial",
  "CoffeeshopRawMaterial",
  "WorkShopRawMaterial",
  "CleaningMaterial",
  "Packaging",
  "DisposableEquipment",
  "FinalProduct",
  "SemiFinalProduct",
];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const categoriesParam = searchParams.get("categories");

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "startDate and endDate are required" },
      { status: 400 }
    );
  }

  // Period boundaries
  const periodStart = new Date(startDate + "T00:00:00.000Z");
  const periodEnd = new Date(endDate + "T23:59:59.999Z");

  const categories =
    categoriesParam
      ?.split(",")
      .map((c) => c.trim())
      .filter((c) => ALLOWED_CATEGORIES.includes(c)) ?? [
      "ProductionRawMaterial",
      "CoffeeshopRawMaterial",
      "Packaging",
    ];

  await connectMongo();

  // 1️⃣ Aggregate inventory items: compute opening and closing quantities
  //    using stockHistory. All math is done server-side in MongoDB.
  //
  //    openingQty = currentQty - sum(stockHistory.change WHERE date >= periodStart)
  //    closingQty = currentQty  - sum(stockHistory.change WHERE date >  periodEnd)
  //
  const itemAgg = (await InventoryItem.aggregate([
    { $match: { category: { $in: categories } } },
    {
      $project: {
        itemName: 1,
        sku: 1,
        category: 1,
        unit: 1,
        currentCostPrice: 1,
        quantity: 1,
        stockHistory: 1,
      },
    },
    {
      $addFields: {
        // Sum of changes that happened ON or AFTER periodStart
        changesFromStart: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$stockHistory",
                  cond: { $gte: ["$$this.date", periodStart] },
                },
              },
              as: "h",
              in: "$$h.change",
            },
          },
        },
        // Sum of changes that happened AFTER periodEnd
        changesAfterEnd: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: "$stockHistory",
                  cond: { $gt: ["$$this.date", periodEnd] },
                },
              },
              as: "h",
              in: "$$h.change",
            },
          },
        },
      },
    },
    {
      $addFields: {
        openingQty: { $subtract: ["$quantity", "$changesFromStart"] },
        closingQty: { $subtract: ["$quantity", "$changesAfterEnd"] },
      },
    },
    {
      $project: {
        stockHistory: 0,
        changesFromStart: 0,
        changesAfterEnd: 0,
      },
    },
  ])) as any[];

  // 2️⃣ Aggregate purchases from Invoices in the period
  const purchaseAgg = (await Invoice.aggregate([
    {
      $match: {
        receivedDate: { $gte: periodStart, $lte: periodEnd },
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.inventoryItemId",
        purchasedQty: { $sum: "$items.quantity" },
        // Weighted total cost from actual invoice costs
        purchasedCost: {
          $sum: { $multiply: ["$items.quantity", "$items.cost"] },
        },
      },
    },
  ])) as any[];

  const purchaseMap = new Map<
    string,
    { purchasedQty: number; purchasedCost: number }
  >();
  for (const p of purchaseAgg) {
    purchaseMap.set(p._id.toString(), {
      purchasedQty: p.purchasedQty,
      purchasedCost: p.purchasedCost,
    });
  }

  // 3️⃣ Combine and compute derived values
  let totalOpeningCost = 0;
  let totalPurchasedCost = 0;
  let totalClosingCost = 0;
  let totalUsedCost = 0;

  const items = itemAgg.map((item: any) => {
    const costPrice = item.currentCostPrice ?? 0;
    const openingQty = Math.max(item.openingQty ?? 0, 0);
    const closingQty = Math.max(item.closingQty ?? 0, 0);

    const purchase = purchaseMap.get(item._id.toString());
    const purchasedQty = purchase?.purchasedQty ?? 0;
    const purchasedCost = purchase?.purchasedCost ?? 0;

    const usedQty = openingQty + purchasedQty - closingQty;

    // Opening and closing valued at current cost price
    const openingCost = round(openingQty * costPrice);
    const closingCost = round(closingQty * costPrice);
    // Used cost = openingCost + actual purchase cost - closingCost
    const usedCost = round(openingCost + purchasedCost - closingCost);

    totalOpeningCost += openingCost;
    totalPurchasedCost += purchasedCost;
    totalClosingCost += closingCost;
    totalUsedCost += usedCost;

    return {
      _id: item._id.toString(),
      itemName: item.itemName,
      sku: item.sku,
      category: item.category,
      unit: item.unit ?? "",
      currentCostPrice: costPrice,
      openingQty: round(openingQty),
      purchasedQty: round(purchasedQty),
      closingQty: round(closingQty),
      usedQty: round(usedQty),
      openingCost,
      purchasedCost: round(purchasedCost),
      closingCost,
      usedCost,
    };
  });

  // Sort by usedCost descending
  items.sort((a, b) => b.usedCost - a.usedCost);

  return NextResponse.json({
    period: { startDate, endDate },
    summary: {
      totalOpeningCost: round(totalOpeningCost),
      totalPurchasedCost: round(totalPurchasedCost),
      totalClosingCost: round(totalClosingCost),
      totalUsedCost: round(totalUsedCost),
      itemCount: items.length,
    },
    items,
  });
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
