export interface IInvoice {
    _id: string;
    supplier: string; // 🔹 ID of the Supplier
    documentId: string;
    filePath: string;
    date: Date;
    documentType: 'DeliveryNote' | 'Invoice';
  
    items: IInvoiceItem[]; // 🔹 Now directly linked to inventory items
  
    createdAt: Date;
    updatedAt: Date;
  }
  
  // **🔹 Items in Invoice**
  export interface IInvoiceItem {
    inventoryItemId: string; // 🔹 ID of the InventoryItem
    itemName: string;
    quantity: number;
    cost: number;
  }
  