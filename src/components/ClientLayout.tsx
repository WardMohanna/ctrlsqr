// components/ClientLayout.tsx (client component)
"use client";

import Navbar from "./Navbar";
import { usePathname } from "next/navigation";
import { Layout } from "antd";

const { Content } = Layout;

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavbar = pathname === "/";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!hideNavbar && <Navbar />}
      <Content>
        {children}
      </Content>
    </Layout>
  );
}
