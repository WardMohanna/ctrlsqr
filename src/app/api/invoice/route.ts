import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Invoice from "@/models/Invoice";
import InventoryItem from "@/models/Inventory";
import Supplier from "@/models/Supplier";
import PriceIncrease from "@/models/PriceIncrease";
import { connectMongo } from "@/lib/db";
import { GridFSBucket } from "mongodb";
import { getSessionUser, requireAuth } from "@/lib/sessionGuard";
import { applyTenantFilter } from "@/lib/tenantFilter";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * GET /api/invoice
 * Return all invoices
 */
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;

    await connectMongo();

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId")?.trim();
    const paginated = searchParams.get("paginated") === "true";
    const page = Math.max(Number(searchParams.get("page") || "1"), 1);
    const rawLimit = Number(searchParams.get("limit") || "15");
    const limit = Math.min(Math.max(rawLimit, 1), 100);
    const search = searchParams.get("search")?.trim() || "";
    const documentType = searchParams.get("documentType")?.trim() || "";

    if (documentId) {
      const tenantBase = applyTenantFilter({} as any, sessionUser!);
      const invoice = await Invoice.findOne(
        { ...tenantBase, documentId },
        { _id: 1, documentId: 1 },
      ).lean();

      return NextResponse.json({ exists: Boolean(invoice) }, { status: 200 });
    }

    const tenantBase = applyTenantFilter({} as any, sessionUser!);
    const filter: Record<string, any> = { ...tenantBase };

    if (documentType) {
      filter.documentType = documentType;
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      const matchingSuppliers = await Supplier.find(
        { name: { $regex: searchRegex } },
        { _id: 1 },
      ).lean();

      filter.$or = [
        { documentId: { $regex: searchRegex } },
        { oneTimeSupplier: { $regex: searchRegex } },
        {
          supplier: {
            $in: matchingSuppliers.map((supplier) => supplier._id),
          },
        },
      ];
    }

    const invoiceQuery = Invoice.find(filter)
      .populate("supplier", "name")
      .select(
        "documentId documentType supplier oneTimeSupplier date receivedDate filePaths items deliveredBy remarks createdAt",
      )
      .sort({ createdAt: -1 })
      .lean();

    if (paginated) {
      const [invoices, total] = await Promise.all([
        invoiceQuery.skip((page - 1) * limit).limit(limit),
        Invoice.countDocuments(filter),
      ]);

      return NextResponse.json(
        {
          items: invoices,
          total,
          page,
          limit,
        },
        { status: 200 },
      );
    }

    const invoices = await invoiceQuery;

    return NextResponse.json(invoices, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching invoices:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/invoice
 * Create invoice + upload files + update inventory
 */
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const guard = requireAuth(sessionUser);
    if (guard) return guard;

    // 1️⃣ connect via mongoose (single source of truth)
    await connectMongo();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("MongoDB connection not ready (mongoose.connection.db is undefined)");
    }

    // 2️⃣ read form data
    const form = await req.formData();

    const supplierId = form.get("supplierId")?.toString() || "";
    const oneTimeSupplier = form.get("oneTimeSupplier")?.toString() || "";
    const documentType = form.get("documentType")?.toString() || "Invoice";
    const officialDocId = form.get("officialDocId")?.toString() || "";
    const deliveredBy = form.get("deliveredBy")?.toString() || "";
    const documentDate = form.get("documentDate")?.toString();
    const receivedDate = form.get("receivedDate")?.toString();
    const remarks = form.get("remarks")?.toString() || "";

    const itemsStr = form.get("items")?.toString() || "[]";
    const parsedItems = JSON.parse(itemsStr);

    // Validate: either supplierId or oneTimeSupplier must be provided
    if (!supplierId && !oneTimeSupplier) {
      return NextResponse.json(
        { error: "Either supplierId or oneTimeSupplier must be provided" },
        { status: 400 }
      );
    }

    if (!officialDocId || parsedItems.length === 0) {
      return NextResponse.json(
        { error: "Missing required invoice fields" },
        { status: 400 }
      );
    }

    const existingInvoice = await Invoice.findOne(
      { documentId: officialDocId },
      { _id: 1 },
    ).lean();

    if (existingInvoice) {
      return NextResponse.json(
        { error: "duplicateOfficialDocId" },
        { status: 409 },
      );
    }

    // 3️⃣ upload files to GridFS (same DB, no localhost)
    const files = form.getAll("file") as File[];
    
    const bucket = new GridFSBucket(db, { bucketName: "uploads" });

    const uploadedFileIds: string[] = [];

    for (const file of files) {
      if (!file || file.size === 0) {
        continue;
      }

      const uploadStream = bucket.openUploadStream(file.name, {
        contentType: file.type,
      });

      const buffer = Buffer.from(await file.arrayBuffer());
      uploadStream.end(buffer);

      await new Promise<void>((resolve, reject) => {
        uploadStream.on("finish", () => {
          // @ts-ignore
          const fileId = uploadStream.id.toHexString();
          uploadedFileIds.push(fileId);
          resolve();
        });
        uploadStream.on("error", reject);
      });
    }

    // 4️⃣ create invoice
    const invoice = new Invoice({
      supplier: supplierId || undefined, // Only set if not empty
      oneTimeSupplier: oneTimeSupplier || undefined, // For one-time suppliers
      documentId: officialDocId,
      documentType,
      deliveredBy,
      date: documentDate ? new Date(documentDate) : new Date(),
      receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
      remarks,
      filePaths: uploadedFileIds,
      tenantId: sessionUser!.tenantId ?? null,
      items: parsedItems.map((i: any) => ({
        inventoryItemId: i.inventoryItemId,
        itemName: i.itemName,
        quantity: i.quantity,
        cost: i.cost,
      })),
    });

    await invoice.save();

    // 5️⃣ detect price increases before bulkWrite
    const itemsWithNewCost = parsedItems.filter(
      (line: any) => !line.isNonSupplierPrice && line.cost != null
    );

    let previousPriceMap = new Map<string, { currentCostPrice: number; itemName: string; sku: string }>();
    if (itemsWithNewCost.length > 0) {
      const existingItems = await InventoryItem.find(
        { _id: { $in: itemsWithNewCost.map((l: any) => l.inventoryItemId) } },
        { _id: 1, currentCostPrice: 1, itemName: 1, sku: 1 }
      ).lean() as any[];
      for (const item of existingItems) {
        previousPriceMap.set(item._id.toString(), {
          currentCostPrice: item.currentCostPrice ?? 0,
          itemName: item.itemName,
          sku: item.sku,
        });
      }
    }

    // 6️⃣ update inventory quantities and cost price (only if not a non-supplier price)
    const inventoryOperations = parsedItems.map((line: any) => {
      const update: any = {
        $inc: { quantity: line.quantity },
        $set: { updatedAt: new Date() },
      };

      if (!line.isNonSupplierPrice) {
        update.$set.currentCostPrice = line.cost;
      }

      return {
        updateOne: {
          filter: { _id: line.inventoryItemId },
          update,
        },
      };
    });

    if (inventoryOperations.length > 0) {
      await InventoryItem.bulkWrite(inventoryOperations, { ordered: false });
    }

    // 7️⃣ save price increase records for any item whose cost went up
    if (itemsWithNewCost.length > 0 && previousPriceMap.size > 0) {
      let resolvedSupplierName = oneTimeSupplier || "Unknown";
      if (supplierId) {
        const sup = await Supplier.findById(supplierId, { name: 1 }).lean() as any;
        if (sup?.name) resolvedSupplierName = sup.name;
      }

      const increases = itemsWithNewCost
        .map((line: any) => {
          const prev = previousPriceMap.get(line.inventoryItemId.toString());
          if (!prev) return null;
          const oldCost = prev.currentCostPrice;
          const newCost = line.cost;
          if (newCost <= oldCost) return null;
          const changePercent =
            oldCost > 0 ? ((newCost - oldCost) / oldCost) * 100 : 100;
          return {
            inventoryItemId: line.inventoryItemId,
            itemName: prev.itemName,
            sku: prev.sku,
            previousCost: oldCost,
            newCost,
            changePercent,
            invoiceId: invoice._id,
            documentId: officialDocId,
            supplierName: resolvedSupplierName,
            receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
            acknowledged: false,
          };
        })
        .filter(Boolean);

      if (increases.length > 0) {
        await PriceIncrease.insertMany(increases);
      }
    }

    return NextResponse.json(
      { message: "Invoice created successfully" },
      { status: 201 }
    );

  } catch (err: any) {
    console.error("❌ Error creating invoice:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
