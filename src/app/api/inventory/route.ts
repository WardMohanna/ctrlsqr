import { NextResponse } from 'next/server';
import InventoryItem from '@/models/Inventory';
import { connectMongo } from '@/lib/db';


export async function POST(req: Request) {
  try {
    await connectMongo();
    const data = await req.json();

    // Add default values for required fields not included in the form
    const itemData: InventoryData = {
      ...data,
      quantity: data.quantity !== undefined ? data.quantity : 0,
      batchNumber: data.batchNumber !== undefined ? data.batchNumber : '',
      supplier: data.supplier !== undefined ? data.supplier : '',
      costHistory: data.costHistory !== undefined ? data.costHistory : [],
      stockHistory: data.stockHistory !== undefined ? data.stockHistory : [],
      expirationDate: data.expirationDate
        ? new Date(data.expirationDate) // Convert string to Date if needed
        : new Date(0) // Default "invalid" date
    };
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
    const items = await InventoryItem.find(); // 🔹 Fetch all inventory items
    return NextResponse.json(items, { status: 200 });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ message: 'Failed to fetch inventory' }, { status: 500 });
  }
}