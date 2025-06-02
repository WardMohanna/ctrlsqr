// components/ClientLayout.tsx (client component)
"use client";

import Navbar from "./Navbar";
//import OfflineBannerClient from "@/components/offlineBannerClient";
import { usePathname } from "next/navigation";

export default function ClientLayout({ children,}: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNavbar = pathname === "/";

  return (
    <>
        {/* <OfflineBannerClient /> */}
        {!hideNavbar && <Navbar />}
        {children}
    </>
  );
}
