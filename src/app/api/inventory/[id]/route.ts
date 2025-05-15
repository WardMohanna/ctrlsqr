// app/api/inventory/[id]/route.ts
import { NextResponse , NextRequest} from "next/server";
import connectMongo from "@/lib/db";
import InventoryItem from "@/models/Inventory";

// GET a single item by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongo();

    const { id } = params;
    const item = await InventoryItem.findById(id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching inventory item:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT (update) an item by ID
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongo();

    const body = await request.json();
    const { id } = params;

    // 1) Update item with new data
    let updatedItem = await InventoryItem.findByIdAndUpdate(
      id,
      body,
      { new: true }
    );

    if (!updatedItem) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    // 2) If it's a Final or Semi-Final, re-compute partialCost for each BOM line
    if (updatedItem.category === "FinalProduct" || updatedItem.category === "SemiFinalProduct") {
      let totalCost = 0;

      // Convert standardBatchWeight from grams -> kg
      const finalProductKg = (updatedItem.standardBatchWeight ?? 0) / 1000;

      // For each BOM line in updatedItem.components:
      for (const comp of updatedItem.components) {
        // Find the raw material
        const rawMat = await InventoryItem.findById(comp.componentId);
        if (!rawMat) continue;

        // costPerKg = rawMat.currentCostPrice
        const costPerKg = rawMat.currentCostPrice ?? 0;
        // fraction = comp.percentage / 100
        const fraction = (comp.percentage ?? 0) / 100;

        // partial cost = costPerKg * fraction * finalProductKg
        const partial = costPerKg * fraction * finalProductKg;

        comp.partialCost = partial; // store partial cost in the BOM line
        totalCost += partial;
      }

      // Also update the overall currentCostPrice
      updatedItem.currentCostPrice = totalCost;
      await updatedItem.save(); // to persist partialCost & costPrice changes
    }

    return NextResponse.json(
      { messageKey: "itemUpdatedSuccess", updatedItem },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json(
      { message: "Failed to update item" },
      { status: 500 }
    );
  }
}

// DELETE an item by ID
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectMongo();

    const { id } = params;
    const deleted = await InventoryItem.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Item successfully deleted" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
