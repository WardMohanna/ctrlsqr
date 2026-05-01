import mongoose from "mongoose";
import InventoryItem from "@/models/Inventory";

export async function buildBomSnapshotFromProduct(
  productId: string,
  InventoryItemModel: typeof InventoryItem = InventoryItem,
): Promise<Array<{ rawMaterial: mongoose.Types.ObjectId; quantityUsed: number }>> {
  const bomSnapshot: Array<{
    rawMaterial: mongoose.Types.ObjectId;
    quantityUsed: number;
  }> = [];
  try {
    const inv = await InventoryItemModel.findById(productId).lean();
    if (inv && (inv as any).components && Array.isArray((inv as any).components)) {
      for (const c of (inv as any).components) {
        bomSnapshot.push({
          rawMaterial: c.componentId,
          quantityUsed: c.quantityUsed ?? 0,
        });
      }
    }
  } catch (err) {
    console.warn("Could not snapshot BOM for product", productId, err);
  }
  return bomSnapshot;
}
