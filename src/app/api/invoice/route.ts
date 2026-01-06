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
export async function GET() {
  try {
    await connectMongo();

    const invoices = await Invoice.find({})
      .populate("supplier", "name")
      .sort({ createdAt: -1 });

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
    const documentType = form.get("documentType")?.toString() || "Invoice";
    const officialDocId = form.get("officialDocId")?.toString() || "";
    const deliveredBy = form.get("deliveredBy")?.toString() || "";
    const documentDate = form.get("documentDate")?.toString();
    const receivedDate = form.get("receivedDate")?.toString();
    const remarks = form.get("remarks")?.toString() || "";

    const itemsStr = form.get("items")?.toString() || "[]";
    const parsedItems = JSON.parse(itemsStr);

    if (!supplierId || !officialDocId || parsedItems.length === 0) {
      return NextResponse.json(
        { error: "Missing required invoice fields" },
        { status: 400 }
      );
    }

    // 3️⃣ upload files to GridFS (same DB, no localhost)
    const files = form.getAll("file") as File[];
    const bucket = new GridFSBucket(db, { bucketName: "uploads" });

    const uploadedFileIds: string[] = [];

    for (const file of files) {
      if (!file || file.size === 0) continue;

      const uploadStream = bucket.openUploadStream(file.name, {
        contentType: file.type,
      });

      const buffer = Buffer.from(await file.arrayBuffer());
      uploadStream.end(buffer);

      await new Promise<void>((resolve, reject) => {
        uploadStream.on("finish", () => {
          // @ts-ignore
          uploadedFileIds.push(uploadStream.id.toHexString());
          resolve();
        });
        uploadStream.on("error", reject);
      });
    }

    // 4️⃣ create invoice
    const invoice = new Invoice({
      supplier: supplierId,
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

    // 5️⃣ update inventory quantities
    for (const line of parsedItems) {
      await InventoryItem.findByIdAndUpdate(
        line.inventoryItemId,
        { $inc: { quantity: line.quantity } },
        { new: true }
      );
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
