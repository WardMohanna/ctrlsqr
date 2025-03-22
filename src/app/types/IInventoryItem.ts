// File: types/IInventoryItem.ts

import { IStockHistory } from "./IStockHistory";

// If you have a separate file for IPriceHistory, you can keep it or merge it here
export interface IPriceHistory {
  price: number;
  date: Date;
}

export interface IInventoryItem {
  sku: string;
  itemName: string;
  category:
    | "ProductionRawMaterial"
    | "CoffeeshopRawMaterial"
    | "CleaningMaterial"
    | "Packaging"
    | "DisposableEquipment"
    | "FinalProduct"
    | "SemiFinalProduct";

  unit?: string;
  barcode?: string;

  currentClientPrice?: number;
  currentBusinessPrice?: number;
  currentCostPrice?: number;

  // If you keep these for historical references
  clientPriceHistory?: IPriceHistory[];
  businessPriceHistory?: IPriceHistory[];
  costPriceHistory?: IPriceHistory[];

  standardBatchWeight?: number;

  // The main BOM array
  components?: IProductComponent[];

  stockHistory: IStockHistory[];

  createdAt?: Date;
  updatedAt?: Date;
}

// Updated to include quantityUsed
export interface IProductComponent {
  componentId: string;
  percentage: number;
  partialCost?: number;
  quantityUsed?: number;  // <--- new field for usage in grams
}

// Stock history as you had before
export interface IStockHistory {
  date: Date;
  change: number;
  type: "Added" | "Used" | "Spilled" | "Produced" | "Other" | "StockCount";
  batchReference?: string;
  referenceDocument?: string;
}
