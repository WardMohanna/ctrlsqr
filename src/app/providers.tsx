"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, useMemo, useEffect, useState } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, theme } from "antd";
import heIL from "antd/locale/he_IL";
import dayjs from "dayjs";
import "dayjs/locale/he";

export function Providers({ children }: { children: ReactNode }) {
  // Add interaction-ready state
  const [isInteractive, setIsInteractive] = useState(false);

  useEffect(() => {
    // Mark as interactive immediately after mount
    setIsInteractive(true);
    // Set dayjs locale to Hebrew
    dayjs.locale("he");
  }, []);

  // Memoize theme config to prevent unnecessary re-renders
  const themeConfig = useMemo(
    () => ({
      algorithm: theme.defaultAlgorithm,
      token: {
        colorPrimary: "#1677ff",
        colorSuccess: "#52c41a",
        colorWarning: "#faad14",
        colorError: "#ff4d4f",
        colorInfo: "#1677ff",
        colorTextBase: "#000000",
        colorBgBase: "#ffffff",
        fontSize: 14,
        borderRadius: 6,
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
          borderRadiusLG: 12,
          boxShadowTertiary:
            "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
        },
        Layout: {
          headerBg: "#001529",
          headerHeight: 64,
          headerPadding: "0 24px",
        },
      },
    }),
    []
  );

  return (
    <SessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
    >
      <AntdRegistry>
        <ConfigProvider
          direction="rtl"
          theme={themeConfig}
          button={{ autoInsertSpace: false }}
          locale={heIL}
        >
          {children}
        </ConfigProvider>
      </AntdRegistry>
    </SessionProvider>
  );
}
