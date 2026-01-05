"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, theme } from "antd";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AntdRegistry>
        <ConfigProvider
          direction="rtl"
          theme={{
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
              fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
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
                boxShadowTertiary: "0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)",
              },
              Layout: {
                headerBg: "#001529",
                headerHeight: 64,
                headerPadding: "0 24px",
              },
            },
          }}
        >
          {children}
        </ConfigProvider>
      </AntdRegistry>
    </SessionProvider>
  );
}
