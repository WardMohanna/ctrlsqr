import { IProductComponent } from './IProductComponent';
import { IStockHistory } from './IStockHistory';

export interface IPriceHistory {
  price: number;
  date: Date;
}

export interface IInventoryItem {
  sku: string;
  itemName: string;
  category:
    | 'ProductionRawMaterial'
    | 'CoffeeshopRawMaterial'
    | 'CleaningMaterial'
    | 'Packaging'
    | 'DisposableEquipment'
    | 'FinalProduct'
    | 'SemiFinalProduct';

  unit?: string;
  barcode?: string;

  currentClientPrice?: number;
  currentBusinessPrice?: number;
  currentCostPrice?: number;

  clientPriceHistory?: IProductPriceHistory[];
  businessPriceHistory?: IProductComponent[];
  costPriceHistory?: IProductComponent[];

  standardBatchWeight?: number;

  components?: IProductComponent[];
  stockHistory: IStockHistory[];

  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProductComponent {
  componentId: string;
  percentage: number;
  partialCost?: number;
}

export interface IStockHistory {
  date: Date;
  change: number;
  type: 'Added' | 'Used' | 'Spilled' | 'Produced' | 'Other' | 'StockCount';
  batchReference?: string;
  referenceDocument?: string;
}
