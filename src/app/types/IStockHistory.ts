export interface IStockHistory {
    date: Date;
    change: number;
    type: 'Added' | 'Used' | 'Spilled' | 'Produced' | 'Other';
    batchReference?: string;
    referenceDocument?: string; // 🔹 Now links to `IInvoice` instead of `Receipt`
  }
  