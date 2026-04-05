import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import connectMongo from "@/lib/db";
import Invoice from "@/models/Invoice";
import Sale from "@/models/Sale";

type MonthlyMap = Record<string, number>;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const yearParam = searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  if (isNaN(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  await connectMongo();

  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, "0");
    return `${year}-${m}`;
  });

  const [invoices, sales] = await Promise.all([
    Invoice.find({ receivedDate: { $gte: yearStart, $lt: yearEnd } })
      .populate("supplier", "name")
      .lean(),
    Sale.find({
      saleDate: { $gte: yearStart, $lt: yearEnd },
      status: "Confirmed",
    })
      .select("saleDate finalTotal")
      .lean(),
  ]);

  // ── Process invoices ──────────────────────────────────────────────
  const supplierMap = new Map<string, MonthlyMap>();
  const purchaseTotals: MonthlyMap = Object.fromEntries(months.map((m) => [m, 0]));

  for (const inv of invoices as any[]) {
    const invoiceTotal: number = (inv.items ?? []).reduce(
      (sum: number, item: any) => sum + item.quantity * item.cost,
      0
    );

    const d = new Date(inv.receivedDate);
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!months.includes(month)) continue;

    const supplierName: string =
      inv.supplier?.name ?? inv.oneTimeSupplier ?? "Unknown";

    if (!supplierMap.has(supplierName)) {
      supplierMap.set(supplierName, Object.fromEntries(months.map((m) => [m, 0])));
    }
    supplierMap.get(supplierName)![month] += invoiceTotal;
    purchaseTotals[month] += invoiceTotal;
  }

  const suppliers = Array.from(supplierMap.entries())
    .map(([name, monthly]) => ({
      name,
      monthly,
      total: Object.values(monthly).reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.total - a.total);

  // ── Process sales (income) ────────────────────────────────────────
  const income: MonthlyMap = Object.fromEntries(months.map((m) => [m, 0]));

  for (const sale of sales as any[]) {
    const d = new Date(sale.saleDate);
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!months.includes(month)) continue;
    income[month] += sale.finalTotal / 1.18; // Strip 18% VAT → ex-VAT income
  }

  const purchaseGrandTotal = Object.values(purchaseTotals).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    year,
    months,
    suppliers,
    purchaseTotals,
    purchaseGrandTotal,
    income,
  });
}
