import InventoryItem from "@/models/Inventory";

export type RawMaterialIssues = {
  missing: Array<{
    materialId: string;
    materialName: string;
    required: number;
    available: number;
  }>;
  insufficient: Array<{
    materialId: string;
    materialName: string;
    required: number;
    available: number;
  }>;
  packagingMissing: Array<{
    materialId: string;
    materialName: string;
    required: number;
    available: number;
  }>;
};

export async function validateRawMaterials(
  productId: string,
  plannedQuantity: number,
): Promise<{
  canProceed: boolean;
  issues: RawMaterialIssues;
  requiresConfirmation: boolean;
}> {
  const issues: RawMaterialIssues = {
    missing: [],
    insufficient: [],
    packagingMissing: [],
  };

  try {
    const product = (await InventoryItem.findById(productId).lean()) as any;
    if (!product || !product.components || !Array.isArray(product.components)) {
      return { canProceed: true, issues, requiresConfirmation: false };
    }

    for (const component of product.components) {
      const componentId = component.componentId;
      const quantityUsed = component.quantityUsed ?? 0;

      if (!quantityUsed || quantityUsed <= 0) {
        continue;
      }

      const rawMaterial = await InventoryItem.findById(componentId);
      if (!rawMaterial) {
        const issue = {
          materialId: componentId.toString(),
          materialName: `Unknown Material (${componentId})`,
          required: quantityUsed * plannedQuantity,
          available: 0,
        };
        issues.missing.push(issue);
        continue;
      }

      let requiredQuantity = quantityUsed * plannedQuantity;

      const unit = (rawMaterial.unit || "").toString().toLowerCase();
      if (unit.includes("kg")) {
        requiredQuantity = requiredQuantity / 1000;
      }

      const availableQuantity = rawMaterial.quantity || 0;

      if (availableQuantity <= 0) {
        const issue = {
          materialId: componentId.toString(),
          materialName: rawMaterial.itemName,
          required: requiredQuantity,
          available: 0,
        };
        if (rawMaterial.category === "Packaging") {
          issues.packagingMissing.push(issue);
        } else {
          issues.missing.push(issue);
        }
      } else if (availableQuantity < requiredQuantity) {
        const issue = {
          materialId: componentId.toString(),
          materialName: rawMaterial.itemName,
          required: requiredQuantity,
          available: availableQuantity,
        };
        if (rawMaterial.category === "Packaging") {
          issues.packagingMissing.push(issue);
        } else {
          issues.insufficient.push(issue);
        }
      }
    }

    const hasIssues =
      issues.missing.length > 0 ||
      issues.insufficient.length > 0 ||
      issues.packagingMissing.length > 0;
    const requiresConfirmation = hasIssues;

    return {
      canProceed: !hasIssues,
      issues,
      requiresConfirmation,
    };
  } catch (error) {
    console.error("Error validating raw materials:", error);
    return { canProceed: true, issues, requiresConfirmation: false };
  }
}
