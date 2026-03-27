"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, useMemo, useEffect, useState } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, theme, App as AntApp } from "antd";
import { usePathname } from "next/navigation";
import heIL from "antd/locale/he_IL";
import enUS from "antd/locale/en_US";
import arEG from "antd/locale/ar_EG";
import ruRU from "antd/locale/ru_RU";
import dayjs from "dayjs";
import "dayjs/locale/he";
import "dayjs/locale/en";
import "dayjs/locale/ar";
import "dayjs/locale/ru";
import ReturnScrollRestorer from "@/components/ReturnScrollRestorer";
import ScrubbableNumberEnhancer from "@/components/ScrubbableNumberEnhancer";
import { getColorScheme } from "@/lib/colorSchemes";
import { LocaleContext, useLocaleState, isRtlLocale } from "@/hooks/useLocale";
import {
  ThemeContext,
  LayoutModeContext,
  useThemeState,
  useLayoutModeState,
} from "@/hooks/useTheme";

function ProvidersContent({ children }: { children: ReactNode }) {
  // Add interaction-ready state
  const [, setIsInteractive] = useState(false);
  const { theme: themeMode, toggleTheme } = useThemeState();
  const localeState = useLocaleState();
  const layoutModeState = useLayoutModeState();
  const pathname = usePathname();

  useEffect(() => {
    // Mark as interactive immediately after mount
    setIsInteractive(true);
  }, []);

  useEffect(() => {
    dayjs.locale(localeState.locale);
  }, [localeState.locale]);

  // Get active color scheme based on theme mode
  const colorScheme = useMemo(() => getColorScheme(themeMode), [themeMode]);
  const colors = colorScheme.colors;

  // synchronize CSS custom properties so Tailwind/other styles can use them
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      // convert camelCase to kebab-case for variable names
      const varName = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
      root.style.setProperty(varName, value);
    });
  }, [colors]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = localeState.locale;
    root.dir = isRtlLocale(localeState.locale) ? "rtl" : "ltr";
    root.setAttribute("data-theme", themeMode);
    root.setAttribute("data-route", pathname || "");
    root.setAttribute("data-layout-mode", layoutModeState.layoutMode);
  }, [themeMode, pathname, layoutModeState.layoutMode, localeState.locale]);

  const antdLocale = useMemo(() => {
    switch (localeState.locale) {
      case "en":
        return enUS;
      case "ar":
        return arEG;
      case "ru":
        return ruRU;
      case "he":
      default:
        return heIL;
    }
  }, [localeState.locale]);

  // Memoize theme config to prevent unnecessary re-renders
  const themeConfig = useMemo(
    () => ({
      algorithm:
        themeMode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: colors.primaryColor,
        colorPrimaryHover: colors.primaryHoverColor || colors.primaryColor,
        colorSuccess: colors.successColor,
        colorWarning: colors.warningColor,
        colorError: colors.errorColor,
        colorInfo: colors.infoColor,
        colorTextBase: colors.textColor,
        /* when a component surface is dark (royal blue) we want light text,
           and using the scheme's primary color (gold) gives the correct
           contrast. Ant Design uses this token for things like Menu, Avatar
           text, and other places where a light-on-dark pairing is needed. */
        colorTextLightSolid: colors.primaryColor,
        colorBgBase: colors.backgroundColor,
        // default container background should be page background (white)
        colorBgContainer: colors.backgroundColor,
        fontSize: 14,
        borderRadius: 8,
        fontFamily:
          "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      },
      components: {
        Button: {
          controlHeight: 40,
          fontSize: 14,
          fontWeight: 500,
        },
        Input: {
          controlHeight: 40,
          fontSize: 14,
        },
        Select: {
          controlHeight: 40,
          fontSize: 14,
        },
        Card: {
          borderRadiusLG: 8,
          boxShadowTertiary:
            "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
        },
        Layout: {
          headerBg: colors.headerBg,
          headerHeight: 64,
          headerPadding: "0 24px",
        },
      },
    }),
    [colors, themeMode],
  );

  // Always render SessionProvider so client hooks like `useSession`
  // are available immediately. Theme initialization may lag a tick
  // while reading localStorage, but that should not prevent auth
  // hooks from working.

  return (
    <LocaleContext.Provider value={localeState}>
      <ThemeContext.Provider value={{ theme: themeMode, toggleTheme }}>
        <LayoutModeContext.Provider value={layoutModeState}>
          <SessionProvider
            refetchInterval={0}
            refetchOnWindowFocus={false}
            refetchWhenOffline={false}
          >
            <AntdRegistry>
              <ConfigProvider
                direction={isRtlLocale(localeState.locale) ? "rtl" : "ltr"}
                theme={themeConfig}
                button={{ autoInsertSpace: false }}
                locale={antdLocale}
              >
                <AntApp>
                  <ReturnScrollRestorer />
                  <ScrubbableNumberEnhancer />
                  {children}
                </AntApp>
              </ConfigProvider>
            </AntdRegistry>
          </SessionProvider>
        </LayoutModeContext.Provider>
      </ThemeContext.Provider>
    </LocaleContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return <ProvidersContent>{children}</ProvidersContent>;
}
