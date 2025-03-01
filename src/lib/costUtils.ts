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
  