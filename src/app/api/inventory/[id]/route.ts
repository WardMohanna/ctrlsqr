// app/api/inventory/[id]/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/utils/dbConnect";   // or your DB connection method
import InventoryItem from "@/models/InventoryItem"; // your Mongoose model

// GET a single item by ID (optional, but handy)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const item = await InventoryItem.findById(params.id);
    if (!item) {
      return new NextResponse(JSON.stringify({ error: "Item not found" }), {
        status: 404,
      });
    }

    return NextResponse.json(item, { status: 200 });
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return new NextResponse(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}

// PUT (update) an item by ID
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const body = await request.json();

    // Attempt to update, returning the new (updated) document
    const updatedItem = await InventoryItem.findByIdAndUpdate(
      params.id,
      body,
      { new: true }
    );

    if (!updatedItem) {
      return new NextResponse(
        JSON.stringify({ message: "Item not found" }),
        { status: 404 }
      );
    }

    // Optionally you can do any post-update logic here
    return NextResponse.json(
      { messageKey: "itemUpdatedSuccess", updatedItem },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return new NextResponse(
      JSON.stringify({ message: "Failed to update item" }),
      { status: 500 }
    );
  }
}

// DELETE an item by ID (optional, only if you want that route)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const deleted = await InventoryItem.findByIdAndDelete(params.id);
    if (!deleted) {
      return new NextResponse(JSON.stringify({ message: "Item not found" }), {
        status: 404,
      });
    }

    return NextResponse.json(
      { message: "Item successfully deleted" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting item:", error);
    return new NextResponse(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}
