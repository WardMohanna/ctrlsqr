import { NextRequest, NextResponse } from "next/server";
import Sale from "@/models/Sale";
import InventoryItem from "@/models/Inventory";
import Account from "@/models/Account";
import Counters from "@/models/Counters";
import { connectMongo } from "@/lib/db";

// Helper function to generate unique sale number
async function getNextSaleNumber() {
  const counter = await Counters.findByIdAndUpdate(
    "SALE",
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `SALE-${counter.seq.toString().padStart(6, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    const fieldsParam = searchParams.get("fields");

    let query = {};
    if (accountId) {
      query = { accountId };
    }

    // Build field projection
    let projection = null;
    if (fieldsParam) {
      projection = fieldsParam.split(",").reduce((acc, field) => {
        acc[field.trim()] = 1;
        return acc;
      }, {} as any);
    }

    const sales = await Sale.find(query, projection).populate('accountId').sort({ saleDate: -1 });
    return NextResponse.json(sales, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ error: "errorFetching" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const body = await req.json();
    const { accountId, items, totalDiscount = 0, notes, importedFrom } = body;

    // Validation
    if (!accountId) {
      return NextResponse.json({ error: "accountIdRequired" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "itemsRequired" }, { status: 400 });
    }

    // Verify account exists
    const account = await Account.findById(accountId);
    if (!account) {
      return NextResponse.json({ error: "accountNotFound" }, { status: 404 });
    }

    // Process items and deduct inventory
    let totalBeforeDiscount = 0;
    const processedItems = [];

    for (const item of items) {
      const product = await InventoryItem.findById(item.productId);

      if (!product) {
        return NextResponse.json(
          { error: `productNotFound: ${item.productId}` },
          { status: 404 }
        );
      }

      // Check inventory availability
      if (product.quantity < item.quantity) {
        return NextResponse.json(
          {
            error: "insufficientQuantity",
            product: product.itemName,
            available: product.quantity,
            requested: item.quantity,
          },
          { status: 400 }
        );
      }

      // Calculate line total
      const unitPrice = item.unitPrice || product.currentClientPrice || 0;
      const lineDiscount = item.lineDiscount || 0;
      const lineTotal = (item.quantity * unitPrice) - lineDiscount;

      totalBeforeDiscount += lineTotal + lineDiscount; // Add back discount to get subtotal

      processedItems.push({
        productId: product._id,
        productName: product.itemName,
        productType: product.category,
        quantity: item.quantity,
        unitPriceSnapshot: unitPrice,
        lineDiscount: lineDiscount,
        lineTotal: lineTotal,
      });

      // Deduct inventory
      product.quantity = Math.max(0, product.quantity - item.quantity);
      product.stockHistory.push({
        date: new Date(),
        change: -item.quantity,
        type: "Sold",
      });

      await product.save();
    }

    // Calculate final total
    const finalTotal = totalBeforeDiscount - totalDiscount;

    // Generate unique sale number
    const saleNumber = await getNextSaleNumber();

    // Create sale record
    const newSale = new Sale({
      accountId,
      saleNumber,
      items: processedItems,
      totalBeforeDiscount,
      totalDiscount,
      finalTotal,
      notes,
      importedFrom,
      status: 'Confirmed',
    });

    await newSale.save();

    return NextResponse.json(newSale, { status: 201 });
  } catch (error: any) {
    console.error("Error creating sale:", error);
    return NextResponse.json({ error: error.message || "errorCreating" }, { status: 500 });
  }
}
