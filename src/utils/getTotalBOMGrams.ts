// src/utils/getTotalBOMGrams.ts
import { ComponentLine, InventoryItem } from "@/lib/types";

export function getTotalBOMGrams(
  components: ComponentLine[],
  inventoryItems: InventoryItem[]
) {
  return components.reduce((sum, comp) => {
    const item = inventoryItems.find((i) => i._id === comp.componentId);
    return item?.category === "Packaging" ? sum : sum + comp.grams;
  }, 0);
}
