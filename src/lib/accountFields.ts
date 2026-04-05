export type AccountFieldKey =
  | "officialEntityName"
  | "taxId"
  | "category"
  | "city"
  | "address"
  | "active"
  | "contacts"
  | "paymentTerms"
  | "creditLimit";

export const builtInAccountFields: Array<{ key: AccountFieldKey; label: string }> = [
  { key: "officialEntityName", label: "Company Name" },
  { key: "taxId", label: "Tax ID" },
  { key: "category", label: "Category" },
  { key: "city", label: "City" },
  { key: "address", label: "Address" },
  { key: "active", label: "Active" },
  { key: "contacts", label: "Contacts" },
  { key: "paymentTerms", label: "Payment Terms" },
  { key: "creditLimit", label: "Credit Limit" },
];

export const defaultVisibleAccountFields: AccountFieldKey[] = builtInAccountFields.map(
  (f) => f.key,
);
