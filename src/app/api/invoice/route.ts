import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import Invoice from "@/models/Invoice";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";

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
 *   - Uses req.formData() for small file upload
 *   - Saves optional file to public/uploads
 *   - Creates Invoice
 *   - Increments each item’s quantity in Inventory
 */
export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    // 1) Use the built-in formData() method
    const form = await req.formData();

    // 2) Extract fields from formData
    const supplierId = form.get("supplierId")?.toString() || "";
    const docType = form.get("documentType")?.toString() || "Invoice";
    const officialDocId = form.get("officialDocId")?.toString() || "";
    const deliveredBy = form.get("deliveredBy")?.toString() || "";
    // documentDate from the form (date on the document)
    const documentDate = form.get("documentDate")?.toString() || "";
    // receivedDate from the form (actual date when inventory is received)
    const receivedDate = form.get("receivedDate")?.toString() || "";
    const remarks = form.get("remarks")?.toString() || "";

    // parse items JSON
    const itemsStr = form.get("items")?.toString() || "[]";
    const parsedItems = JSON.parse(itemsStr);

    // 3) If there's a file, read it into memory & save it
    const file = form.get("file") as File | null;
    let filePath: string | undefined;
    if (file && file.size > 0) {
      // read file into memory
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // create an uploads dir if needed
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // unique file name
      const fileName = `${Date.now()}-${file.name}`;
      const finalPath = path.join(uploadDir, fileName);

      // save file to disk
      fs.writeFileSync(finalPath, buffer);

      // store relative path for DB
      filePath = `/uploads/${fileName}`;
    }

    // 4) Create invoice doc
    const newInvoice = new Invoice({
      supplier: supplierId,               // must be a valid ObjectId
      documentId: officialDocId,          // your schema's "documentId" field
      deliveredBy,
      // Set the document date (from the form) in the "date" field
      date: documentDate || Date.now(),
      // Use the new receivedDate field to store the actual receiving date
      receivedDate: receivedDate || Date.now(),
      filePath,
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

    // 5) Update each item’s quantity in Inventory
    for (const line of parsedItems) {
      await InventoryItem.findByIdAndUpdate(line.inventoryItemId, {
        $inc: { quantity: line.quantity },
      });
    }

    return NextResponse.json(
      { message: "Invoice created successfully" },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error creating invoice:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
