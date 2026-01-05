// components/ClientLayout.tsx (client component)
"use client";

import Navbar from "./Navbar";
import { usePathname } from "next/navigation";
import { Layout } from "antd";
import { useMemo } from "react";

const { Content } = Layout;

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavbar = pathname === "/";

  // Memoize layout style to prevent recalculation
  const layoutStyle = useMemo(() => ({ minHeight: "100vh" }), []);

  return (
    <Layout style={layoutStyle}>
      {!hideNavbar && <Navbar />}
      <Content>
        {children}
      </Content>
    </Layout>
  );
}
