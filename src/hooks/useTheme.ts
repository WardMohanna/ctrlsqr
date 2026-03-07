import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

type ThemeMode = "light" | "dark";
type LayoutMode = "classic" | "dashboard";

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
}

interface LayoutModeContextType {
  layoutMode: LayoutMode;
  isDashboardCollapsed: boolean;
  setLayoutMode: (mode: LayoutMode) => void;
  toggleLayoutMode: () => void;
  toggleDashboardCollapsed: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

export const LayoutModeContext = createContext<
  LayoutModeContextType | undefined
>(undefined);

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function useLayoutMode(): LayoutModeContextType {
  const context = useContext(LayoutModeContext);
  if (!context) {
    throw new Error("useLayoutMode must be used within a LayoutModeProvider");
  }
  return context;
}

export function useThemeState() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme") as ThemeMode | null;

      const initialTheme = storedTheme || "dark";
      setTheme(initialTheme);
      setIsInitialized(true);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "light" ? "dark" : "light";
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", newTheme);
      }
      return newTheme;
    });
  }, []);

  return { theme, toggleTheme, isInitialized };
}

export function useLayoutModeState() {
  const [layoutMode, setLayoutModeState] = useState<LayoutMode>("classic");
  const [isDashboardCollapsed, setIsDashboardCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedMode = localStorage.getItem("layout-mode") as LayoutMode | null;
    const storedCollapsed = localStorage.getItem("dashboard-collapsed");

    if (storedMode === "classic" || storedMode === "dashboard") {
      setLayoutModeState(storedMode);
    }

    if (storedCollapsed === "true") {
      setIsDashboardCollapsed(true);
    }
  }, []);

  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setLayoutModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("layout-mode", mode);
    }
  }, []);

  const toggleLayoutMode = useCallback(() => {
    setLayoutModeState((current) => {
      const next = current === "classic" ? "dashboard" : "classic";
      if (typeof window !== "undefined") {
        localStorage.setItem("layout-mode", next);
      }
      return next;
    });
  }, []);

  const toggleDashboardCollapsed = useCallback(() => {
    setIsDashboardCollapsed((current) => {
      const next = !current;
      if (typeof window !== "undefined") {
        localStorage.setItem("dashboard-collapsed", String(next));
      }
      return next;
    });
  }, []);

  return {
    layoutMode,
    isDashboardCollapsed,
    setLayoutMode,
    toggleLayoutMode,
    toggleDashboardCollapsed,
  };
}
