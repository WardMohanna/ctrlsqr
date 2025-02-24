import { IProductComponent } from './IProductComponent';
import { IStockHistory } from './IStockHistory';

export interface IInventoryItem {
  sku: string;
  itemName: string;
  category:
    | 'ProductionRawMaterial'
    | 'CoffeeshopRawMaterial'
    | 'CleaningMaterial'
    | 'Packaging'
    | 'DisposableEquipment'
    | 'SemiFinalProduct'
    | 'FinalProduct';

  quantity: number;
  minQuantity: number;
  barcode?: string;

  // 🔹 New optional unit field
  unit?: string;

  clientPrice?: number;
  businessPrice?: number;
  costPrice?: number;

  components?: IProductComponent[];
  stockHistory: IStockHistory[];

  createdAt: Date;
  updatedAt: Date;
}
