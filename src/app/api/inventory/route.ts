import { NextResponse } from 'next/server';
import InventoryItem from '@/models/Inventory';
import { connectMongo } from '@/lib/db';

/** 
 * Define an interface so we know which fields are expected.
 * This includes 'unit' and 'minQuantity' because they're required in the schema.
 */
interface InventoryData {
  sku: string;
  itemName: string;
  category: string;
  quantity?: number;
  minQuantity?: number;
  barcode?: string;
  clientPrice?: number;
  businessPrice?: number;
  costPrice?: number;
  unit?: string;           // 🔹 Make sure we have 'unit' here
  components?: any[];      // For BOM 
  stockHistory?: any[];
  expirationDate?: string | Date;
  batchNumber?: string;
  supplier?: string;
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    const data = await req.json();

    // Merge data with defaults for required fields not included in the form
    const itemData: InventoryData = {
      ...data,

      // If quantity is missing, default to 0
      quantity: data.quantity !== undefined ? data.quantity : 0,

      // minQuantity is required in the schema, so ensure we pass something
      minQuantity: data.minQuantity !== undefined ? data.minQuantity : 0,

      // Ensure 'unit' is always a string, even if null
      unit: data.unit !== undefined && data.unit !== null ? data.unit : '',

      // Optionally handle costPrice, supplier, etc. if needed
      costPrice: data.costPrice ?? 0,
      supplier: data.supplier ?? '',
      // ...
      // stockHistory, components, etc. remain from the spread above
    };

    // Create & save the new item
    const newItem = new InventoryItem(itemData);
    await newItem.save();

    return NextResponse.json({ message: 'Item added successfully', item: newItem }, { status: 201 });
  } catch (error) {
    console.error('Error adding item:', error);
    return NextResponse.json({ message: 'Failed to add item' }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectMongo();
    const items = await InventoryItem.find();
    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ message: 'Failed to fetch inventory' }, { status: 500 });
  }
}
