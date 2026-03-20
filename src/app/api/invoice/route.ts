import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Invoice from "@/models/Invoice";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";
import { GridFSBucket } from "mongodb";

/**
 * GET /api/invoice
 * Return all invoices
 */
export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get("documentId")?.trim();

    if (documentId) {
      const invoice = await Invoice.findOne(
        { documentId },
        { _id: 1, documentId: 1 },
      ).lean();

      return NextResponse.json({ exists: Boolean(invoice) }, { status: 200 });
    }

    const invoices = await Invoice.find({})
      .populate("supplier", "name")
      .sort({ createdAt: -1 })
      .lean();

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
      items: parsedItems.map((i: any) => ({
        inventoryItemId: i.inventoryItemId,
        itemName: i.itemName,
        quantity: i.quantity,
        cost: i.cost,
      })),
    });

    await invoice.save();

    // 5️⃣ update inventory quantities and cost price (only if not a non-supplier price)
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

    return NextResponse.json(
      { message: "Invoice created successfully" },
      { status: 201 }
    );

  } catch (err: any) {
    console.error("❌ Error creating invoice:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
