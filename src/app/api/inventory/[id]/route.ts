// app/api/inventory/[id]/route.ts
import { NextResponse , NextRequest} from "next/server";
import connectMongo from "@/lib/db";   // or your DB connection method
import InventoryItem from "@/models/Inventory"; // your Mongoose model

// GET a single item by ID (optional, but handy)

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse>{
  try {
    await connectMongo();

    const { id } = await context.params;
    const item = await InventoryItem.findById(id);

    if (!item) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(item, { status: 200 });
  } catch (err: any) {
    console.error("Error fetching inventory item:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

// PUT (update) an item by ID
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse>{
  try {
    await connectMongo();

    const body = await request.json();

    // Attempt to update, returning the new (updated) document
    const { id } = await context.params;
    const updatedItem = await InventoryItem.findByIdAndUpdate(
      id,
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
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse>{
  try {
    await connectMongo();

    const { id } = await context.params;
    const deleted = await InventoryItem.findByIdAndDelete(id);
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
