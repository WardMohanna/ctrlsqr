import { NextResponse } from 'next/server';
import InventoryItem from '@/models/Inventory';
import { connectMongo } from '@/lib/db';
import Counters from '@/models/Counters';

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
  unit?: string;
  standardBatchWeight?: number; // Ensure we have this in the interface
  components?: any[];
  stockHistory?: any[];
  expirationDate?: string | Date;
  batchNumber?: string;
  supplier?: string;
}

// A helper to get the next sequential SKU
async function getNextSKU() {
  // Atomic increment in "SKU" doc
  const counter = await Counters.findOneAndUpdate(
    { _id: 'SKU' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // Format: e.g. "SKU-00042"
  const seqNumber = String(counter.seq).padStart(5, '0');
  return `SKU-${seqNumber}`;
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    const data = await req.json();

    // If quantity or minQuantity missing, set defaults
    const quantity = data.quantity !== undefined ? data.quantity : 0;
    const minQuantity = data.minQuantity !== undefined ? data.minQuantity : 0;

    // If user left SKU blank or used a placeholder, generate one
    let finalSKU = data.sku;
    if (!finalSKU || finalSKU === 'AUTO-SKU-PLACEHOLDER') {
      finalSKU = await getNextSKU();
    }

    // Build the item data
    const itemData: InventoryData = {
      ...data,
      sku: finalSKU,
      quantity,
      minQuantity,
      unit: data.unit ?? '',
      costPrice: data.costPrice ?? 0,
      supplier: data.supplier ?? '',
      standardBatchWeight: data.standardBatchWeight ?? 0,
    };

    // Create & save the item
    const newItem = new InventoryItem(itemData);
    await newItem.save();

    // If it's a final or semi-finished product, recalc the cost from the BOM
    if (data.category === 'FinalProduct' || data.category === 'SemiFinalProduct') {
      const cost = await newItem.calculateCost(); // uses BOM + raw materials' costPrice
      newItem.costPrice = cost;
      await newItem.save();
    }

    return NextResponse.json({ message: 'Item added successfully', item: newItem }, { status: 201 });
  } catch (error) {
    console.error('Error adding item:', error);
    return NextResponse.json({ message: 'Failed to add item' }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectMongo();
    // Populate costPrice on raw materials so you can compute partial costs in the BOM popup
    const items = await InventoryItem.find()
      .populate('components.componentId', 'itemName unit costPrice');

    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ message: 'Failed to fetch inventory' }, { status: 500 });
  }
}
