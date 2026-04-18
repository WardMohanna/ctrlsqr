import { NextResponse } from "next/server";
import { getDbForTenant } from "@/lib/db";
import { getTenantModels } from "@/lib/tenantModels";
import { getSessionUser, requireAuth } from "@/lib/sessionGuard";

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

interface InventoryCostItem {
  _id: string;
  currentCostPrice?: number;
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;

    const data = await req.json();

    const db = await getDbForTenant(sessionUser!.tenantId!);
    const { InventoryItem, Counters } = getTenantModels(db);

    // Helper scoped to this request so Counters model is in scope
    async function getNextSKU() {
      const counter = await Counters.findOneAndUpdate(
        { _id: "SKU" },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const seqNumber = String(counter.seq).padStart(5, "0");
      return `SKU-${seqNumber}`;
    }

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

    // If it's a final or semi-finished product, compute partialCost for each BOM line, sum into currentCostPrice
    if (
      (data.category === "FinalProduct" || data.category === "SemiFinalProduct") &&
      Array.isArray(itemData.components) &&
      itemData.components.length > 0
    ) {
      let totalCost = 0;

      const componentIds = itemData.components.map((component) => component.componentId);
      const rawMaterials = await InventoryItem.find(
        { _id: { $in: componentIds } },
        { _id: 1, currentCostPrice: 1 },
      ).lean<InventoryCostItem[]>();
      const rawMaterialCosts = new Map(
        rawMaterials.map((rawMaterial) => [String(rawMaterial._id), rawMaterial.currentCostPrice ?? 0]),
      );

      // Convert the entire final product weight to kg
      const finalProductKg = (itemData.standardBatchWeight ?? 0) / 1000;

      // For each BOM line, look up the raw material cost once from the batched query
      for (const comp of itemData.components) {
        const costPerKg = rawMaterialCosts.get(String(comp.componentId));
        if (costPerKg === undefined) continue;

        // fraction = comp.percentage / 100 => e.g. 80% => 0.8
        const fraction = comp.percentage / 100;

        // partial cost = costPerKg * fractionOfFinalProduct * finalProductKg
        const partial = costPerKg * finalProductKg * fraction;

        // Store partialCost in DB
        comp.partialCost = partial;

        // Accumulate total cost
        totalCost += partial;
      }

      itemData.currentCostPrice = totalCost;
    }

    // Create & save the item
    // Mongoose will store quantityUsed if your schema includes it
    const newItem = new InventoryItem(itemData);
    await newItem.save();

    return NextResponse.json(
      { messageKey: "itemAddedSuccess", item: newItem },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error adding item:", error.message || error);
    
    // Check for duplicate SKU error (MongoDB error code 11000)
    if (error.code === 11000 && error.keyPattern?.sku) {
      return NextResponse.json({ error: "duplicateSKU" }, { status: 409 });
    }
    
    return NextResponse.json({ error: "itemAddedFailure", details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;

    const db = await getDbForTenant(sessionUser!.tenantId!);
    const { InventoryItem } = getTenantModels(db);

    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get("category");
    const fieldsParam = searchParams.get("fields");
    const itemId = searchParams.get("itemId");
    const includeComponents = searchParams.get("includeComponents") === "true";
    const paginated = searchParams.get("paginated") === "true";
    const inStockOnly = searchParams.get("inStockOnly") === "true";
    const search = searchParams.get("search")?.trim();
    const page = Math.max(Number(searchParams.get("page") || "1"), 1);
    const rawLimit = Number(searchParams.get("limit") || "15");
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    
    // Build query filter — scoped to tenant DB (no filter needed)
    const filter: any = {};
    if (categoryParam) {
      const categories = categoryParam.split(",").map(c => c.trim());
      filter.category = { $in: categories };
    }

    if (inStockOnly) {
      filter.quantity = { $gt: 0 };
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
      filter.$or = [
        { sku: searchRegex },
        { itemName: searchRegex },
        { category: searchRegex },
        { unit: searchRegex },
        { barcode: searchRegex },
      ];
    }
    
    // Build field projection
    let projection = null;
    if (fieldsParam) {
      const requestedFields = fieldsParam
        .split(",")
        .map((field) => field.trim())
        .filter(Boolean);

      if (
        requestedFields.length === 1 &&
        requestedFields[0] === "category" &&
        !categoryParam
      ) {
        const ALL_CATEGORIES = [
          "ProductionRawMaterial",
          "CoffeeshopRawMaterial",
          "WorkShopRawMaterial",
          "CleaningMaterial",
          "Packaging",
          "DisposableEquipment",
          "FinalProduct",
          "SemiFinalProduct",
        ];
        const usedCategories = await InventoryItem.distinct("category");
        // Return all known categories so the filter works even on an empty tenant DB
        const merged = Array.from(new Set([...ALL_CATEGORIES, ...usedCategories]));
        return NextResponse.json(merged.sort(), { status: 200 });
      }

      projection = fieldsParam.split(",").reduce((acc, field) => {
        acc[field.trim()] = 1;
        return acc;
      }, {} as any);
    }

    if (itemId) {
      let itemQuery = InventoryItem.findById(itemId, projection);

      if (includeComponents) {
        itemQuery = itemQuery.populate(
          "components.componentId",
          "itemName unit currentCostPrice category"
        );
      }

      const item = await itemQuery.lean();

      if (!item) {
        return NextResponse.json({ message: "Item not found" }, { status: 404 });
      }

      return NextResponse.json(item, { status: 200 });
    }

    if (paginated) {
      let paginatedQuery = InventoryItem.find(filter, projection)
        .sort({ itemName: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit);

      if (includeComponents) {
        paginatedQuery = paginatedQuery.populate(
          "components.componentId",
          "itemName unit currentCostPrice category"
        );
      }

      const [items, total] = await Promise.all([
        paginatedQuery.lean(),
        InventoryItem.countDocuments(filter),
      ]);

      return NextResponse.json(
        {
          items,
          total,
          page,
          limit,
        },
        { status: 200 },
      );
    }
    
    // Fetch with filters
    let query = InventoryItem.find(filter, projection);
    
    // Only populate if not using minimal fields
    if (!fieldsParam || includeComponents) {
      query = query.populate(
        "components.componentId",
        "itemName unit currentCostPrice category"
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
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;

    const db = await getDbForTenant(sessionUser!.tenantId!);
    const { InventoryItem } = getTenantModels(db);

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