// Utility to fetch and use admin client settings

export interface ClientSettingsConfig {
  visibleFields: string[];
  mandatoryFields: string[];
  defaultVisibleFields: string[];
  availableCustomFields: Array<{ name: string; description?: string }>;
  allowMultipleCategories: boolean;
  allowCustomCategories: boolean;
  allowCustomPaymentTerms: boolean;
}

let cachedSettings: ClientSettingsConfig | null = null;

export async function getClientSettings(): Promise<ClientSettingsConfig> {
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    const response = await fetch("/api/client-settings", { cache: "no-store" });
    if (response.ok) {
      cachedSettings = await response.json();
      return cachedSettings;
    }
  } catch (error) {
    console.error("Failed to fetch client settings:", error);
  }

  // Return defaults if fetch fails
  return {
    visibleFields: [
      "officialEntityName",
      "taxId",
      "category",
      "city",
      "address",
      "active",
      "contacts",
      "paymentTerms",
      "creditLimit",
    ],
    mandatoryFields: ["officialEntityName", "taxId"],
    defaultVisibleFields: [
      "officialEntityName",
      "taxId",
      "category",
      "city",
      "address",
      "active",
      "contacts",
      "paymentTerms",
      "creditLimit",
    ],
    availableCustomFields: [],
    allowMultipleCategories: false,
    allowCustomCategories: true,
    allowCustomPaymentTerms: true,
  };
}

export function clearCachedSettings(): void {
  cachedSettings = null;
}
