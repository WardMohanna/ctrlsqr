// lib/costUtils.ts

/**
 * Check if a unit represents pieces/count-based items
 */
export function isPiecesUnit(unit: string | undefined): boolean {
  if (!unit) return false;
  const normalizedUnit = unit.toString().toLowerCase().trim();
  return normalizedUnit === "pieces" || normalizedUnit === "pcs";
}

/**
 * Check if a unit represents weight in kilograms (cost per kg, usage in grams)
 */
export function isKgUnit(unit: string | undefined): boolean {
  if (!unit) return false;
  const normalizedUnit = unit.toString().toLowerCase().trim();
  return normalizedUnit === "kg";
}

/**
 * Check if a unit represents volume in liters (cost per liter, usage in ml)
 */
export function isLitersUnit(unit: string | undefined): boolean {
  if (!unit) return false;
  const normalizedUnit = unit.toString().toLowerCase().trim();
  return normalizedUnit === "liters" || normalizedUnit === "l";
}

export function getPartialCost(
    rawMaterial: any,    // or a better-typed object
    usedAmount: number
  ): number {
    const { unit, costPrice = 0 } = rawMaterial;
    return calculateCostByUnit(unit, costPrice, usedAmount);
  }

/**
 * UNIFIED COST CALCULATION FUNCTION
 * Calculate the total cost for a given usage amount based on the raw material's unit and cost price.
 * 
 * @param unit - The unit of the raw material ('kg', 'grams', 'g', 'pieces', 'pcs', 'liters', 'l', 'ml')
 * @param currentCostPrice - The cost price per unit (per kg, per gram, per piece, etc.)
 * @param usedAmount - The amount used (in grams for weight, ml for volume, count for pieces)
 * @returns The total cost for the used amount
 * 
 * Unit assumptions:
 * - 'kg': costPrice is per kg, usedAmount is in grams → divide by 1000
 * - 'grams'/'g': costPrice is per gram, usedAmount is in grams → direct multiply
 * - 'pieces'/'pcs': costPrice is per piece, usedAmount is in pieces → direct multiply
 * - 'liters'/'l': costPrice is per liter, usedAmount is in ml → divide by 1000
 * - 'ml': costPrice is per ml, usedAmount is in ml → direct multiply
 * - empty/unknown: direct multiply (assumes cost is per unit used)
 */
export function calculateCostByUnit(
  unit: string | undefined,
  currentCostPrice: number,
  usedAmount: number
): number {
  const price = currentCostPrice || 0;
  
  if (usedAmount <= 0 || price <= 0) return 0;

  const normalizedUnit = (unit || '').toString().toLowerCase().trim();

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
      // Default: assume costPrice is for the unit as-is (direct multiply)
      return usedAmount * price;
  }
}

/**
 * UNIFIED COST CALCULATION FROM RAW MATERIAL OBJECT
 * Use this when you have the full raw material object with unit and currentCostPrice
 * 
 * @param rawMaterial - Object with unit and currentCostPrice properties
 * @param usedAmount - The amount used
 * @returns The calculated cost
 */
export function calculateMaterialCost(
  rawMaterial: { unit?: string; currentCostPrice?: number; costPrice?: number } | null | undefined,
  usedAmount: number
): number {
  if (!rawMaterial) return 0;
  const price = rawMaterial.currentCostPrice ?? rawMaterial.costPrice ?? 0;
  return calculateCostByUnit(rawMaterial.unit, price, usedAmount);
}

/**
 * Get display-friendly unit and convert usage amount for display
 * @param unit - The raw material unit
 * @param usedAmount - Usage amount in base units
 * @returns Object with displayAmount and displayUnit
 */
export function getDisplayUsage(
  unit: string | undefined,
  usedAmount: number
): { displayAmount: number; displayUnit: string } {
  const normalizedUnit = (unit || '').toString().toLowerCase().trim();

  switch (normalizedUnit) {
    case "kg":
      // Convert grams to kg for display
      return { displayAmount: usedAmount / 1000, displayUnit: "kg" };
    case "grams":
    case "g":
      return { displayAmount: usedAmount, displayUnit: "g" };
    case "pieces":
    case "pcs":
      return { displayAmount: usedAmount, displayUnit: "pcs" };
    case "liters":
    case "l":
      // Convert ml to liters for display
      return { displayAmount: usedAmount / 1000, displayUnit: "L" };
    case "ml":
      return { displayAmount: usedAmount, displayUnit: "ml" };
    default:
      return { displayAmount: usedAmount, displayUnit: normalizedUnit || "unit" };
  }
}
  