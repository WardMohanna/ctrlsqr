export interface ISupplier {
  _id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string; // 🔹 Useful for invoice tracking
  paymentTerms?: 'Net 30' | 'Net 60' | 'Prepaid' | 'Cash on Delivery'; // 🔹 Optional payment conditions

  createdAt: Date;
  updatedAt: Date;
}
