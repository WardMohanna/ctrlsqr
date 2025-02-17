import { NextResponse } from 'next/server';
import InventoryItem from '@/models/Inventory';
import { connectMongo } from '@/lib/db';

export async function POST(req: Request) {
  try {
    await connectMongo();
    const data = await req.json();

    // Add default values for required fields not included in the form
    const itemData = {
      ...data,
      quantity: 0, // Default value
      batchNumber: '', // Default empty string
      supplier: '', // Optional field
      costHistory: [],
      stockHistory: [],
      expirationDate: new Date(0) // Default invalid date (or any fallback)
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