import { NextRequest, NextResponse } from "next/server";
import InventoryItem from "@/models/Inventory";
import { connectMongo } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    await connectMongo();

    const { productId, quantity } = await req.json();

    // Validate input
    if (!productId) {
      return NextResponse.json(
        { error: "Product ID is required" },
        { status: 400 }
      );
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be greater than 0" },
        { status: 400 }
      );
    }

    // Find the product
    const product = await InventoryItem.findById(productId);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Validate it's a FinalProduct
    if (product.category !== "FinalProduct") {
      return NextResponse.json(
        { error: "Only final products can be sold" },
        { status: 400 }
      );
    }

    // Check available quantity
    const availableQuantity = product.quantity || 0;
    if (availableQuantity < quantity) {
      return NextResponse.json(
        { 
          error: "Insufficient quantity available",
          availableQuantity,
          requestedQuantity: quantity
        },
        { status: 400 }
      );
    }

    // Update inventory
    product.quantity = Math.max(0, product.quantity - quantity);

    // Add to stock history
    product.stockHistory.push({
      date: new Date(),
      change: -quantity,
      type: "Sold",
    });

    await product.save();

    return NextResponse.json(
      { 
        message: "Items sold successfully",
        product: {
          _id: product._id,
          itemName: product.itemName,
          quantity: product.quantity,
        }
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error selling items:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sell items" },
      { status: 500 }
    );
  }
}
