// File: src/lib/getTotalBOMGrams.ts
import type { ComponentLine, InventoryItem } from '@/lib/types' // adjust paths as needed

export function getTotalBOMGrams(components: ComponentLine[], inventoryItems: InventoryItem[]) {
  // Your function logic
  return components.reduce((sum, comp) => {
    const item = inventoryItems.find(i => i._id === comp.componentId)
    return sum + (item?.grams ?? 0)
  }, 0)
}
