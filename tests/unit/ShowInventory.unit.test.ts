/** tests/unit/ShowInventory.unit.test.ts */

import { getTotalBOMCost } from "@/app/inventory/show/page"; 
// ^ Make sure this path matches your project structure exactly
//   If your file is at "app/inventory/show/page.tsx" and you exported the function there.

describe("getTotalBOMCost", () => {
  it("returns 0 if item is null or has no components", () => {
    // If item is null, we expect 0
    expect(getTotalBOMCost(null)).toBe(0);
    // If item is missing 'components', also 0
    expect(getTotalBOMCost({} as any)).toBe(0);
  });

  it("calculates cost for packaging", () => {
    // For packaging: cost = currentCostPrice * quantityUsed
    const item = {
      components: [
        {
          componentId: {
            _id: "pkg123",
            category: "Packaging",
            currentCostPrice: 2.0, // cost per piece
          },
          quantityUsed: 5,        // 5 pieces
        },
      ],
    } as any;

    // cost = 2.0 * 5 = 10
    expect(getTotalBOMCost(item)).toBe(10);
  });

  it("calculates cost for non-packaging using partialCost", () => {
    // For raw materials, we rely on partialCost instead of currentCostPrice
    const item = {
      components: [
        {
          componentId: {
            _id: "raw123",
            category: "ProductionRawMaterial",
            currentCostPrice: 100, // Not used if partialCost is given
          },
          partialCost: 15,
          quantityUsed: 10, // quantityUsed is irrelevant if partialCost is used
        },
      ],
    } as any;

    // cost = partialCost = 15
    expect(getTotalBOMCost(item)).toBe(15);
  });

  it("sums multiple components", () => {
    const item = {
      components: [
        // Packaging
        {
          componentId: {
            _id: "pkg456",
            category: "Packaging",
            currentCostPrice: 1.5,
          },
          quantityUsed: 4, // => cost=1.5*4=6
        },
        // Another packaging
        {
          componentId: {
            _id: "pkg789",
            category: "Packaging",
            currentCostPrice: 3,
          },
          quantityUsed: 1, // => cost=3*1=3
        },
        // Raw material with partialCost
        {
          componentId: {
            _id: "raw456",
            category: "ProductionRawMaterial",
          },
          partialCost: 5,
          quantityUsed: 10, // partialCost overrides it => 5
        },
      ],
    } as any;

    // total = (6 + 3 + 5) = 14
    expect(getTotalBOMCost(item)).toBe(14);
  });

  it("handles zero or negative cost gracefully", () => {
    const item = {
      components: [
        {
          componentId: {
            _id: "pkg999",
            category: "Packaging",
            currentCostPrice: 0, // free packaging?
          },
          quantityUsed: 10, // => cost = 0 * 10 = 0
        },
        {
          componentId: {
            _id: "raw999",
            category: "ProductionRawMaterial",
          },
          partialCost: -20, // If partialCost is negative, the sum will reflect that
        },
      ],
    } as any;
    // total = 0 + (-20) = -20
    expect(getTotalBOMCost(item)).toBe(-20);
  });
});
