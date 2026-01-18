import { NextResponse } from "next/server";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";
import Counters from "@/models/Counters";

interface InventoryData {
  sku: string;
  itemName: string;
  category: string;
  quantity?: number;
  minQuantity?: number;
  barcode?: string;
  currentClientPrice?: number;
  currentBusinessPrice?: number;
  currentCostPrice?: number;
  unit?: string;
  standardBatchWeight?: number;
  components?: any[]; // includes { componentId, percentage, quantityUsed, partialCost }
  stockHistory?: any[];
  expirationDate?: string | Date;
  batchNumber?: string;
  supplier?: string;
}

// A helper to get the next sequential SKU
async function getNextSKU() {
  const counter = await Counters.findOneAndUpdate(
    { _id: "SKU" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seqNumber = String(counter.seq).padStart(5, "0");
  return `SKU-${seqNumber}`;
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    const data = await req.json();

    // Default quantity/minQuantity
    const quantity = data.quantity ?? 0;
    const minQuantity = data.minQuantity ?? 0;

    // If user left SKU blank or used placeholder, generate one
    let finalSKU = data.sku;
    if (!finalSKU || finalSKU === "AUTO-SKU-PLACEHOLDER") {
      finalSKU = await getNextSKU();
    }

    // Build item data using the new price fields
    // NOTE: data.components will contain quantityUsed if the client sends it
    const itemData: InventoryData = {
      ...data,
      sku: finalSKU,
      quantity,
      minQuantity,
      unit: data.unit ?? "",
      currentCostPrice: data.currentCostPrice ?? 0,
      supplier: data.supplier ?? "",
      standardBatchWeight: data.standardBatchWeight ?? 0,
    };

    // Create & save the item
    // Mongoose will store quantityUsed if your schema includes it
    const newItem = new InventoryItem(itemData);
    await newItem.save();

    // If it's a final or semi-finished product, compute partialCost for each BOM line, sum into currentCostPrice
    if (data.category === "FinalProduct" || data.category === "SemiFinalProduct") {
      let totalCost = 0;

      // Convert the entire final product weight to kg
      const finalProductKg = (newItem.standardBatchWeight ?? 0) / 1000;

      // For each BOM line, find the raw material & compute partial cost
      for (const comp of newItem.components) {
        const rawMat = await InventoryItem.findById(comp.componentId);
        if (!rawMat) continue;

        // rawMat.currentCostPrice is cost per 1 kg
        const costPerKg = rawMat.currentCostPrice ?? 0;

        // fraction = comp.percentage / 100 => e.g. 80% => 0.8
        const fraction = comp.percentage / 100;

        // partial cost = costPerKg * fractionOfFinalProduct * finalProductKg
        const partial = costPerKg * finalProductKg * fraction;

        // Store partialCost in DB
        comp.partialCost = partial;

        // Accumulate total cost
        totalCost += partial;
      }

      // Now update the final product's currentCostPrice & BOM partialCosts
      newItem.currentCostPrice = totalCost;
      await newItem.save();
    }

    return NextResponse.json(
      { messageKey: "itemAddedSuccess", item: newItem },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding item:", error);
    return NextResponse.json({ message: "Failed to add item" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectMongo();
    
    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get("category");
    const fieldsParam = searchParams.get("fields");
    
    // Build query filter
    let filter = {};
    if (categoryParam) {
      const categories = categoryParam.split(",").map(c => c.trim());
      filter = { category: { $in: categories } };
    }
    
    // Build field projection
    let projection = null;
    if (fieldsParam) {
      projection = fieldsParam.split(",").reduce((acc, field) => {
        acc[field.trim()] = 1;
        return acc;
      }, {} as any);
    }
    
    // Fetch with filters
    let query = InventoryItem.find(filter, projection);
    
    // Only populate if not using minimal fields
    if (!fieldsParam) {
      query = query.populate(
        "components.componentId",
        "itemName unit currentCostPrice"
      );
    }
    
    const items = await query.lean();

    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ message: "Failed to fetch inventory" }, { status: 500 });
  }
}

// ADD THE DELETE BELOW
export async function DELETE(req: Request) {
  try {
    await connectMongo();

    // Parse the itemId from the query string
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json({ error: "No itemId provided" }, { status: 400 });
    }

    const deleted = await InventoryItem.findByIdAndDelete(itemId);
    if (!deleted) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Item deleted successfully", itemId },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}