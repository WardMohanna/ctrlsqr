/** tests/unit/AddInventoryItem.unit.test.ts */
import { getTotalBOMGrams } from "@/app/inventory/add/page"; 
// ^ Adjust the import path to match where you placed getTotalBOMGrams

describe("getTotalBOMGrams", () => {
  it("returns 0 if no components", () => {
    const result = getTotalBOMGrams([], []);
    expect(result).toBe(0);
  });

  it("adds grams for raw materials but ignores packaging", () => {
    const components = [
      { componentId: "pkg1", grams: 100 },
      { componentId: "raw1", grams: 50 },
      { componentId: "raw2", grams: 25 },
    ];
    const inventoryItems = [
      { _id: "pkg1", itemName: "pkg1", category: "Packaging" },
      { _id: "raw1", itemName: "raw1", category: "ProductionRawMaterial" },
      { _id: "raw2", itemName: "raw2", category: "CoffeeshopRawMaterial" },
    ];
    // packaging => skip 100
    // raw1 => 50
    // raw2 => 25
    // total => 75
    const result = getTotalBOMGrams(components, inventoryItems);
    expect(result).toBe(75);
  });

  it("sums multiple raw components, ignoring multiple packaging", () => {
    const components = [
      { componentId: "pkg1", grams: 10 },
      { componentId: "pkg2", grams: 20 },
      { componentId: "raw1", grams: 50 },
      { componentId: "raw2", grams: 25 },
    ];
    const inventoryItems = [
      { _id: "pkg1", itemName: "pkg1", category: "Packaging" },
      { _id: "pkg2", itemName: "pkg2", category: "Packaging" },
      { _id: "raw1", itemName: "raw1", category: "ProductionRawMaterial" },
      { _id: "raw2", itemName: "raw2", category: "SemiFinalProduct" }, // still treated as raw
    ];
    // pkg1 => ignore 10
    // pkg2 => ignore 20
    // raw1 => add 50
    // raw2 => add 25
    // total => 75
    expect(getTotalBOMGrams(components, inventoryItems)).toBe(75);
  });
});
