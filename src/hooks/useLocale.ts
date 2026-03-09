import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type AppLocale = "he" | "en" | "ar" | "ru";

interface LocaleContextType {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

const STORAGE_KEY = "app-locale";

export const LocaleContext = createContext<LocaleContextType | undefined>(
  undefined,
);

export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

export function useLocaleState() {
  const [locale, setLocaleState] = useState<AppLocale>("he");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY) as AppLocale | null;
    if (
      stored === "he" ||
      stored === "en" ||
      stored === "ar" ||
      stored === "ru"
    ) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((nextLocale: AppLocale) => {
    setLocaleState(nextLocale);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, nextLocale);
    }
  }, []);

  return { locale, setLocale };
}

export function isRtlLocale(locale: AppLocale): boolean {
  return locale === "he" || locale === "ar";
}
