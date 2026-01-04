import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Invoice from "@/models/Invoice";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";
import { GridFSBucket } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

// ✅ חשוב בוורסל: להכריח node ולהגדיל זמן ריצה
export const runtime = "nodejs";
export const maxDuration = 60; // אפשר לשנות ל-30/60 לפי התוכנית שלך

/**
 * GET /api/invoice
 *   Return all invoices
 */
export async function GET() {
  try {
    await connectMongo();
    const invoices = await Invoice.find({}).populate("supplier", "name");
    return NextResponse.json(invoices, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching invoices:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/invoice
 *   - Uses req.formData()
 *   - Uploads optional files to GridFS (streaming, no arrayBuffer)
 *   - Creates Invoice
 *   - Increments each item’s quantity in Inventory (bulkWrite)
 */
export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    await connectMongo();
    const db = await getDb();

    // 1) Read formData
    const form = await req.formData();

    // 2) Extract fields
    const supplierId = form.get("supplierId")?.toString() || "";
    const docType = form.get("documentType")?.toString() || "Invoice";
    const officialDocId = form.get("officialDocId")?.toString() || "";
    const deliveredBy = form.get("deliveredBy")?.toString() || "";
    const documentDateStr = form.get("documentDate")?.toString() || "";
    const receivedDateStr = form.get("receivedDate")?.toString() || "";
    const remarks = form.get("remarks")?.toString() || "";

    // parse items JSON
    const itemsStr = form.get("items")?.toString() || "[]";
    const parsedItems = JSON.parse(itemsStr);

    // Dates (עדיף לשמור Date אמיתי)
    const documentDate = documentDateStr ? new Date(documentDateStr) : new Date();
    const receivedDate = receivedDateStr ? new Date(receivedDateStr) : new Date();

    // 3) Upload files into GridFS (✅ streaming instead of arrayBuffer)
    const files = form.getAll("file") as File[];
    const bucket = new GridFSBucket(db, { bucketName: "uploads" });

    const uploadedFileIds: string[] = [];

    for (const file of files) {
      if (!file || file.size === 0) continue;

      const uploadStream = bucket.openUploadStream(file.name, {
        contentType: file.type,
      });

      // Convert Web ReadableStream -> Node Readable and pipe it
      const nodeReadable = Readable.fromWeb(file.stream() as any);

      // pipeline resolves only after uploadStream finishes
      await pipeline(nodeReadable, uploadStream);

      uploadedFileIds.push(uploadStream.id.toHexString());
    }

    // 4) Create invoice doc
    const newInvoice = new Invoice({
      supplier: supplierId, // ObjectId
      documentId: officialDocId,
      deliveredBy,
      date: documentDate,
      receivedDate: receivedDate,
      filePaths: uploadedFileIds,
      documentType: docType,
      remarks,
      items: parsedItems.map((i: any) => ({
        inventoryItemId: i.inventoryItemId,
        itemName: i.itemName,
        quantity: i.quantity,
        cost: i.cost,
      })),
    });

    await newInvoice.save();

    // 5) Update inventory quantities (✅ bulkWrite instead of N awaits)
    if (Array.isArray(parsedItems) && parsedItems.length > 0) {
      const ops = parsedItems
        .filter((line: any) => line?.inventoryItemId && Number(line?.quantity) > 0)
        .map((line: any) => ({
          updateOne: {
            filter: { _id: line.inventoryItemId },
            update: { $inc: { quantity: Number(line.quantity) } },
          },
        }));

      if (ops.length > 0) {
        await InventoryItem.bulkWrite(ops, { ordered: false });
      }
    }

    console.log(
      `POST /api/invoice done in ${Date.now() - startedAt}ms (files=${uploadedFileIds.length}, items=${parsedItems?.length || 0})`
    );

    return NextResponse.json(
      { message: "Invoice created successfully" },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error creating invoice:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
