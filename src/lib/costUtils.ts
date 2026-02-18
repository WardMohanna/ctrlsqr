// lib/costUtils.ts

export function getPartialCost(
    rawMaterial: any,    // or a better-typed object
    usedAmount: number
  ): number {
    const { unit, costPrice = 0 } = rawMaterial;
    if (!unit) return 0;
  
    switch (unit) {
      case "kg":
        // costPrice is per 1 kg, usedAmount might be grams
        return (usedAmount / 1000) * costPrice;
      case "grams":
        // costPrice is per 1 gram
        return usedAmount * costPrice;
      case "pieces":
        // costPrice is per 1 piece
        return usedAmount * costPrice;
      case "liters":
        // costPrice is per 1 liter, usedAmount might be ml
        return (usedAmount / 1000) * costPrice;
      case "ml":
        // costPrice is per 1 ml
        return usedAmount * costPrice;
      default:
        return 0;
    }
  }

/**
 * Calculate the total cost for a given usage amount based on the raw material's unit and cost price.
 * 
 * @param unit - The unit of the raw material ('kg', 'grams', 'pieces', 'liters', 'ml')
 * @param currentCostPrice - The cost price per unit (per kg, per gram, per piece, etc.)
 * @param usedAmount - The amount used (in grams for weight, ml for volume, count for pieces)
 * @returns The total cost for the used amount
 * 
 * Unit assumptions:
 * - 'kg': costPrice is per kg, usedAmount is in grams
 * - 'grams': costPrice is per gram, usedAmount is in grams
 * - 'pieces': costPrice is per piece, usedAmount is in pieces
 * - 'liters': costPrice is per liter, usedAmount is in ml
 * - 'ml': costPrice is per ml, usedAmount is in ml
 */
export function calculateCostByUnit(
  unit: string,
  currentCostPrice: number,
  usedAmount: number
): number {
  const normalizedUnit = (unit || '').toString().toLowerCase().trim();
  const price = currentCostPrice || 0;
  
  if (!normalizedUnit || usedAmount <= 0) return 0;

  switch (normalizedUnit) {
    case "kg":
      // costPrice is per 1 kg, usedAmount is in grams
      return (usedAmount / 1000) * price;
    case "grams":
    case "g":
      // costPrice is per 1 gram, usedAmount is in grams
      return usedAmount * price;
    case "pieces":
    case "pcs":
      // costPrice is per 1 piece, usedAmount is in pieces
      return usedAmount * price;
    case "liters":
    case "l":
      // costPrice is per 1 liter, usedAmount is in ml
      return (usedAmount / 1000) * price;
    case "ml":
      // costPrice is per 1 ml, usedAmount is in ml
      return usedAmount * price;
    default:
      // Default: assume costPrice is for the unit as-is
      return usedAmount * price;
  }
}

/**
 * Get display-friendly unit and convert usage amount for display
 * @param unit - The raw material unit
 * @param usedAmount - Usage amount in base units
 * @returns Object with displayAmount and displayUnit
 */
export function getDisplayUsage(
  unit: string,
  usedAmount: number
): { displayAmount: number; displayUnit: string } {
  const normalizedUnit = (unit || '').toString().toLowerCase().trim();

  switch (normalizedUnit) {
    case "kg":
      // Already in kg, display as-is or convert from grams
      return { displayAmount: usedAmount / 1000, displayUnit: "kg" };
    case "grams":
    case "g":
      return { displayAmount: usedAmount, displayUnit: "g" };
    case "pieces":
    case "pcs":
      return { displayAmount: usedAmount, displayUnit: "pcs" };
    case "liters":
    case "l":
      return { displayAmount: usedAmount / 1000, displayUnit: "L" };
    case "ml":
      return { displayAmount: usedAmount, displayUnit: "ml" };
    default:
      return { displayAmount: usedAmount, displayUnit: normalizedUnit || "unit" };
  }
}
  