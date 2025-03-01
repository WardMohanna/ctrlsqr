import { NextRequest, NextResponse } from "next/server";
import formidable from "formidable";
import fs from "fs"; // only if you need to save the file
import path from "path"; // only if you need to save the file
import Invoice from "@/models/Invoice";
import { connectMongo } from "@/lib/db";

// Turn off Next.js's built-in body parsing, so we can handle it with formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * parseFormData:
 *   Actually parse multipart/form-data with formidable,
 *   returning { fields, file } if a file is uploaded.
 */
async function parseFormData(req: NextRequest) {
  return new Promise<{ fields: any; file: any }>((resolve, reject) => {
    const form = formidable({ multiples: false });
    // We cast req to 'any' because NextRequest is not the same shape as a Node req
    form.parse(req as any, (err, fields, files) => {
      if (err) return reject(err);

      // If your front-end uses "file" as the field name for the upload:
      const file = files.file || null;
      resolve({ fields, file });
    });
  });
}

/**
 * Optional helper to save the file somewhere if needed
 */
async function saveFileSomewhere(file: any) {
  // Example: Save to local "uploads" folder
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const tempPath = file.filepath; // formidable's temp location
  const fileName = `${Date.now()}-${file.originalFilename}`;
  const finalPath = path.join(uploadDir, fileName);

  fs.renameSync(tempPath, finalPath);
  // Return the relative path so we can store it in DB
  return `/uploads/${fileName}`;
}

/**
 * GET /api/invoice
 *   Returns all invoices from the DB
 */
export async function GET() {
  try {
    await connectMongo();
    // .populate("supplier", "name") if you want the supplier name
    const invoices = await Invoice.find({});
    return NextResponse.json(invoices, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching invoices:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/invoice
 *   Creates a new invoice, parsing multipart form data with formidable
 */
export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    // 1) Parse form data & file with formidable
    const { fields, file } = await parseFormData(req);

    // 2) Extract your fields from the 'fields' object
    const {
      supplierId,
      officialDocId,
      deliveredBy,
      documentDate,
      deliveryDate,
      remarks,
      items
    } = fields;

    // If 'items' is JSON-stringified, parse it
    const parsedItems = items ? JSON.parse(items) : [];

    // 3) If there's a file, save it, else undefined
    let filePath: string | undefined;
    if (file) {
      filePath = await saveFileSomewhere(file);
    }

    // 4) Create the invoice doc
    const newInvoice = new Invoice({
      supplier: supplierId,            // must be a valid ObjectId
      documentId: officialDocId,       // rename if your schema uses something else
      deliveredBy,
      documentDate,
      date: deliveryDate || Date.now(), // your "date" field in schema
      filePath,                        // optional if your schema doesn't require it
      documentType: "Invoice",         // or "DeliveryNote" if needed
      remarks,
      items: parsedItems.map((i: any) => ({
        inventoryItemId: i.inventoryItemId,
        itemName: i.itemName,
        quantity: i.quantity,
        cost: i.cost,
      })),
    });

    await newInvoice.save();

    return NextResponse.json(
      { message: "Invoice created successfully" },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error creating invoice:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
