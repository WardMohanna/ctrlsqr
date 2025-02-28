import { NextRequest, NextResponse } from "next/server";
import Invoice from "@/models/Invoice";
import { connectMongo } from "@/lib/db";

// These are just placeholders for your actual file-parsing logic.
// In a real app, you'd use 'formidable' or 'multer' or some other library.
async function parseFormData(req: NextRequest) {
  // Pseudo-code: parse multipart/form-data from the request
  // Return an object: { fields: { ... }, file: {...} }
  return {
    fields: {
      supplierId: "",
      officialDocId: "",
      deliveredBy: "",
      documentDate: "",
      deliveryDate: "",
      remarks: "",
      items: "[]",
    },
    file: null, // or { ... }
  };
}

async function saveFileSomewhere(file: any) {
  // Pseudo-code: save the file to disk, S3, etc.
  // Return the path or URL to the saved file.
  return "/uploads/invoices/fakePath.pdf";
}

/**
 * GET /api/invoice
 *  - Returns all invoices from the DB
 */
export async function GET() {
  try {
    await connectMongo();
    // If you want to populate the 'supplier' field:
    // .populate("supplier", "name")
    const invoices = await Invoice.find({});
    return NextResponse.json(invoices, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching invoices:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/invoice
 *  - Creates a new invoice (previously in create/route.ts)
 */
export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    // 1) Parse form data & file
    const { fields, file } = await parseFormData(req);

    const {
      supplierId,
      officialDocId,
      deliveredBy,
      documentDate,
      deliveryDate,
      remarks,
      items,
    } = fields;

    // 2) Parse items array from JSON
    const parsedItems = JSON.parse(items); // e.g. [{ inventoryItemId, itemName, quantity, cost }, ...]

    // 3) Save the file (if any) & get file path
    const filePath = file ? await saveFileSomewhere(file) : "";

    // 4) Create the invoice doc
    const newInvoice = new Invoice({
      supplier: supplierId,
      documentId: officialDocId,
      deliveredBy,
      documentDate,               // if you have a separate doc date field
      date: deliveryDate || Date.now(), // your "date" field in schema
      filePath,
      documentType: "Invoice", // or "DeliveryNote" if needed
      remarks,
      items: parsedItems.map((i: any) => ({
        inventoryItemId: i.inventoryItemId,
        itemName: i.itemName,
        quantity: i.quantity,
        cost: i.cost,
      })),
    });

    await newInvoice.save();

    // (Optional) update inventory stock, cost checks, etc.

    return NextResponse.json(
      { message: "Invoice created successfully" },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Error creating invoice:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
