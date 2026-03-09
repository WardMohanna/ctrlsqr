/**
 * Color Schemes for the Application
 * Easily switch between different color palettes by changing the ACTIVE_SCHEME constant
 */

export type ColorScheme = {
  name: string;
  colors: {
    primaryColor: string;
    /** optional hover variant for primary buttons/links */
    primaryHoverColor?: string;
    successColor: string;
    warningColor: string;
    errorColor: string;
    infoColor: string;
    textColor: string;
    backgroundColor: string;
    headerBg: string;
    accentColor: string;
  };
};

// Original Color Scheme (Blue-based)
export const ORIGINAL_SCHEME: ColorScheme = {
  name: "Original",
  colors: {
    primaryColor: "#1677ff",
    successColor: "#52c41a",
    warningColor: "#faad14",
    errorColor: "#ff4d4f",
    infoColor: "#1677ff",
    textColor: "#000000",
    backgroundColor: "#ffffff",
    headerBg: "#001529",
    accentColor: "#1677ff",
  },
};

// New Color Scheme (Yellow & Dark - from Real Time Colors)
export const REALTIME_SCHEME: ColorScheme = {
  name: "RealTime Colors",
  colors: {
    primaryColor: "#fbd72c", // Yellow
    primaryHoverColor: "#e6c720",
    successColor: "#a64403", // Brown/Orange
    warningColor: "#fbeba3", // Light Yellow
    errorColor: "#a64403", // Brown (used for error)
    infoColor: "#fbd72c", // Yellow
    textColor: "#343434", // Dark Gray
    backgroundColor: "#ffffff", // White
    headerBg: "#343434", // Dark Gray
    accentColor: "#a64403", // Brown/Orange
  },
};

// New color palette based on royal blue & gold - LIGHT MODE
export const GOLD_ROYAL_LIGHT: ColorScheme = {
  name: "Gold & Royal Blue - Light",
  colors: {
    primaryColor: "#ffdb53", // gold
    primaryHoverColor: "#f2c61c", // darker gold for hover
    successColor: "#52c41a", // keep green for success
    warningColor: "#faad14", // amber warning
    errorColor: "#ff4d4f", // red errors
    infoColor: "#132c4b", // royal blue info accent
    textColor: "#2e2c2c", // dark gray text
    backgroundColor: "#ffffff", // page background is white
    headerBg: "#132c4b", // royal blue header/cards
    accentColor: "#132c4b", // same royal blue
  },
};

// Dark mode version - DARK MODE
export const GOLD_ROYAL_DARK: ColorScheme = {
  name: "Gold & Royal Blue - Dark",
  colors: {
    primaryColor: "#ffdb53", // gold (same, stands out on dark)
    primaryHoverColor: "#f2c61c", // darker gold for hover
    successColor: "#52c41a", // keep green for success
    warningColor: "#faad14", // amber warning
    errorColor: "#ff4d4f", // red errors
    infoColor: "#ffdb53", // gold accent for info
    textColor: "#e8e8e8", // light gray text
    backgroundColor: "#1a1a1a", // dark page background
    headerBg: "#0f0f0f", // darker header
    accentColor: "#ffdb53", // gold accent
  },
};

/**
 * Helper function to get the current color scheme based on theme mode
 */
export function getColorScheme(theme: "light" | "dark" = "light"): ColorScheme {
  return theme === "dark" ? GOLD_ROYAL_DARK : GOLD_ROYAL_LIGHT;
}

/**
 * Helper function to get a specific color from the active scheme
 */
export function getColor(
  colorName: keyof ColorScheme["colors"],
  theme: "light" | "dark" = "light",
): string | undefined {
  return getColorScheme(theme).colors[colorName];
}
