// components/ClientLayout.tsx (client component)
"use client";

import Navbar from "./Navbar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layout } from "antd";
import { useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { addRecentActivity } from "@/lib/recentActivities";
import { useLayoutMode } from "@/hooks/useTheme";
import DashboardShell from "./DashboardShell";

const { Content, Footer } = Layout;

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { layoutMode } = useLayoutMode();
  const hideNavbar = pathname === "/";
  const userId = (session?.user as { id?: string } | undefined)?.id;

  // Keep footer pinned to page bottom on short screens.
  const layoutStyle = useMemo(
    () => ({
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column" as const,
    }),
    [],
  );

  const contentStyle = useMemo(
    () => ({
      flex: 1,
      paddingBottom: 50,
      background: "var(--background-color)",
    }),
    [],
  );

  useEffect(() => {
    if (!userId || !pathname) return;
    addRecentActivity(userId, pathname);
  }, [pathname, userId]);

  if (!hideNavbar && layoutMode === "dashboard") {
    return <DashboardShell>{children}</DashboardShell>;
  }

  return (
    <Layout style={layoutStyle}>
      {!hideNavbar && <Navbar />}
      <Content style={contentStyle}>{children}</Content>
      <Footer
        style={{
          background: "var(--header-bg)",
          color: "var(--primary-color)",
          padding: "80px 24px",
          minHeight: 320,
          borderTop: "1px solid rgba(255, 219, 83, 0.25)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
              alignItems: "center",
            }}
          >
            <Link
              href="/support"
              style={{ color: "var(--primary-color)", textDecoration: "none" }}
            >
              Support
            </Link>
            <Link
              href="/contact"
              style={{ color: "var(--primary-color)", textDecoration: "none" }}
            >
              Contact Us
            </Link>
            <Link
              href="/terms"
              style={{ color: "var(--primary-color)", textDecoration: "none" }}
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              style={{ color: "var(--primary-color)", textDecoration: "none" }}
            >
              Privacy Policy
            </Link>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              textAlign: "left",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 600 }}>
              Powered by La Chocolita Software
            </div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {new Date().getFullYear()} CtrlSqr. All rights reserved.
            </div>
          </div>
        </div>
      </Footer>
    </Layout>
  );
}
