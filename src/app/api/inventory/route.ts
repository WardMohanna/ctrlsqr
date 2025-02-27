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
  standardBatchWeight?: number;
  components?: any[];
  stockHistory?: any[];
  expirationDate?: string | Date;
  batchNumber?: string;
  supplier?: string;
}

// A helper to get the next sequential SKU
async function getNextSKU() {
  const counter = await Counters.findOneAndUpdate(
    { _id: 'SKU' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const seqNumber = String(counter.seq).padStart(5, '0');
  return `SKU-${seqNumber}`;
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    const data = await req.json();

    // Default quantity/minQuantity
    const quantity = data.quantity ?? 0;
    const minQuantity = data.minQuantity ?? 0;

    // If user left SKU blank or used placeholder, generate one
    let finalSKU = data.sku;
    if (!finalSKU || finalSKU === 'AUTO-SKU-PLACEHOLDER') {
      finalSKU = await getNextSKU();
    }

    // Build item data
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

    // If it's a final or semi-finished product, compute partialCost for each BOM line, sum into costPrice
    if (data.category === 'FinalProduct' || data.category === 'SemiFinalProduct') {
      let totalCost = 0;

      // Convert the entire final product weight to kg
      const finalProductKg = (newItem.standardBatchWeight ?? 0) / 1000;

      // For each BOM line, find the raw material & compute partial cost
      for (const comp of newItem.components) {
        const rawMat = await InventoryItem.findById(comp.componentId);
        if (!rawMat) continue;

        // rawMat.costPrice is cost per 1 kg
        const costPerKg = rawMat.costPrice ?? 0;

        // fraction = comp.percentage / 100 => e.g. 80% => 0.8
        const fraction = comp.percentage / 100;

        // partial cost = costPerKg * fractionOfFinalProduct * finalProductKg
        // e.g. if finalProductKg=0.1 (100g), fraction=0.8 => 0.08 kg => cost= 0.08 * costPerKg
        const partial = costPerKg * finalProductKg * fraction;

        // Store partialCost in DB
        comp.partialCost = partial;

        // Accumulate total cost
        totalCost += partial;
      }

      // Now update the final product's costPrice & BOM partialCosts
      newItem.costPrice = totalCost;
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
    // Populate costPrice + partialCost on raw materials so you can compute partial costs in the BOM popup
    const items = await InventoryItem.find()
      .populate('components.componentId', 'itemName unit costPrice');

    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ message: 'Failed to fetch inventory' }, { status: 500 });
  }
}
