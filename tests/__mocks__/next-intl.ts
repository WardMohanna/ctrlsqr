// tests/__mocks__/next-intl.ts
export function useTranslations() {
    return (key: string) => {
      switch (key) {
        case "errorSKURequired":
          return "SKU is required";
        case "errorItemNameRequired":
          return "Item Name is required";
        case "errorCategoryRequired":
          return "Category is required";
        // Add other keys as needed
        default:
          return key;
      }
    };
  }
  
  // If you need NextIntlClientProvider, mock it too:
  export default function NextIntlClientProvider({ children }: any) {
    return children;
  }
  