import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { flushSync } from "react-dom";
import { getColorScheme } from "@/lib/colorSchemes";

type ThemeMode = "light" | "dark";
type LayoutMode = "classic" | "dashboard";

export type ThemeToggleOrigin = {
  x: number;
  y: number;
};

type ViewTransition = {
  ready: Promise<void>;
  finished: Promise<void>;
};

type DocumentWithViewTransition = Document & {
  startViewTransition?: (
    updateCallback: () => void | Promise<void>,
  ) => ViewTransition;
};

const THEME_REVEAL_DURATION_MS = 2100;
interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: (origin?: ThemeToggleOrigin) => void;
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

export function getThemeToggleOrigin(
  event?: Event,
): ThemeToggleOrigin | undefined {
  if (!event) return undefined;

  const target =
    "currentTarget" in event && event.currentTarget
      ? event.currentTarget
      : event.target;

  if (!(target instanceof Element)) {
    return undefined;
  }

  const rect = target.getBoundingClientRect();
  const hasClientCoords =
    "clientX" in event &&
    typeof (event as any).clientX === "number" &&
    typeof (event as any).clientY === "number" &&
    ((event as any).clientX !== 0 || (event as any).clientY !== 0);

  return {
    x: hasClientCoords ? (event as any).clientX : rect.left + rect.width / 2,
    y: hasClientCoords ? (event as any).clientY : rect.top + rect.height / 2,
  };
}

function syncThemeToDocument(theme: ThemeMode) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const colors = getColorScheme(theme).colors;

  root.setAttribute("data-theme", theme);
  Object.entries(colors).forEach(([key, value]) => {
    const varName = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
    root.style.setProperty(varName, value);
  });
}

function getTransitionRadius(origin: ThemeToggleOrigin) {
  if (typeof window === "undefined") return 0;

  return Math.hypot(
    Math.max(origin.x, window.innerWidth - origin.x),
    Math.max(origin.y, window.innerHeight - origin.y),
  );
}

function createThemeTransitionOverlay(
  origin: ThemeToggleOrigin,
  nextTheme: ThemeMode,
) {
  if (typeof document === "undefined") return null;

  const overlay = document.createElement("div");
  const revealLayer = document.createElement("div");
  const glowLayer = document.createElement("div");
  const particleCount = 12;
  const radius = getTransitionRadius(origin);
  const colors = getColorScheme(nextTheme).colors;

  overlay.className = "theme-transition-overlay";
  revealLayer.className = "theme-transition-reveal";
  glowLayer.className = "theme-transition-glow";

  overlay.style.setProperty("--theme-transition-origin-x", `${origin.x}px`);
  overlay.style.setProperty("--theme-transition-origin-y", `${origin.y}px`);
  overlay.style.setProperty("--theme-transition-radius", `${radius}px`);
  overlay.style.setProperty(
    "--theme-transition-overlay-bg",
    colors.backgroundColor,
  );
  overlay.style.setProperty(
    "--theme-transition-overlay-accent",
    colors.primaryColor,
  );
  overlay.style.setProperty("--theme-transition-overlay-ink", colors.headerBg);

  overlay.appendChild(revealLayer);
  overlay.appendChild(glowLayer);

  for (let index = 0; index < particleCount; index += 1) {
    const particle = document.createElement("span");
    particle.className = "theme-transition-particle";
    particle.style.setProperty(
      "--theme-particle-angle",
      `${(360 / particleCount) * index}deg`,
    );
    particle.style.setProperty(
      "--theme-particle-distance",
      `${Math.max(52, Math.min(160, radius * 0.2))}px`,
    );
    particle.style.setProperty("--theme-particle-delay", `${index * 18}ms`);
    particle.style.setProperty("--theme-particle-size", `${4 + (index % 3)}px`);
    overlay.appendChild(particle);
  }

  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.classList.add("theme-transition-overlay-active");
  });

  return overlay;
}

export function useThemeState() {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [isInitialized, setIsInitialized] = useState(false);
  const isTransitioningRef = useRef(false);

  // Initialize theme from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme") as ThemeMode | null;

      const initialTheme = storedTheme || "dark";
      setTheme(initialTheme);
      syncThemeToDocument(initialTheme);
      setIsInitialized(true);
    }
  }, []);

  const toggleTheme = useCallback(
    (origin?: ThemeToggleOrigin) => {
      const nextTheme = theme === "light" ? "dark" : "light";

      if (typeof window === "undefined") {
        setTheme(nextTheme);
        return;
      }

      if (isTransitioningRef.current) {
        return;
      }

      const resolvedOrigin = origin ?? {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };

      const applyTheme = () => {
        localStorage.setItem("theme", nextTheme);
        syncThemeToDocument(nextTheme);
        setTheme(nextTheme);
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        applyTheme();
        return;
      }

      isTransitioningRef.current = true;

      const root = document.documentElement;
      const doc = document as DocumentWithViewTransition;
      const cleanup = (overlay?: HTMLDivElement | null) => {
        overlay?.remove();
        root.removeAttribute("data-theme-transitioning");
        root.style.removeProperty("--theme-transition-origin-x");
        root.style.removeProperty("--theme-transition-origin-y");
        root.style.removeProperty("--theme-transition-radius");
        isTransitioningRef.current = false;
      };

      root.setAttribute("data-theme-transitioning", "true");
      root.style.setProperty(
        "--theme-transition-origin-x",
        `${resolvedOrigin.x}px`,
      );
      root.style.setProperty(
        "--theme-transition-origin-y",
        `${resolvedOrigin.y}px`,
      );
      root.style.setProperty(
        "--theme-transition-radius",
        `${getTransitionRadius(resolvedOrigin)}px`,
      );

      if (doc.startViewTransition) {
        const overlay = createThemeTransitionOverlay(resolvedOrigin, nextTheme);
        const transition = doc.startViewTransition(() => {
          flushSync(() => {
            applyTheme();
          });
        });

        transition.ready
          .then(() => {
            const radius = getTransitionRadius(resolvedOrigin);

            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${resolvedOrigin.x}px ${resolvedOrigin.y}px)`,
                  `circle(${radius}px at ${resolvedOrigin.x}px ${resolvedOrigin.y}px)`,
                ],
              },
              {
                duration: THEME_REVEAL_DURATION_MS,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                fill: "both",
                pseudoElement: "::view-transition-new(root)",
              },
            );

            document.documentElement.animate(
              {
                opacity: [1, 0],
                filter: ["brightness(1)", "brightness(0.88)"],
              },
              {
                duration: Math.round(THEME_REVEAL_DURATION_MS * 0.7),
                easing: "ease-out",
                fill: "both",
                pseudoElement: "::view-transition-old(root)",
              },
            );
          })
          .catch(() => {
            // If the pseudo-element animation path fails, the theme still switches.
          });

        transition.finished.finally(() => {
          cleanup(overlay);
        });

        return;
      }

      const overlay = createThemeTransitionOverlay(resolvedOrigin, nextTheme);

      applyTheme();

      window.setTimeout(() => {
        cleanup(overlay);
      }, THEME_REVEAL_DURATION_MS + 140);
    },
    [theme],
  );

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
