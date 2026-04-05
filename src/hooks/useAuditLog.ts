"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Fires a server-side audit log entry on every unique page navigation.
 * Call this hook once in a layout component that has access to the session.
 * It's fire-and-forget — errors are silently swallowed to never disrupt the UX.
 */
export function useAuditLog() {
  const pathname = usePathname();
  const lastLogged = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastLogged.current) return;
    lastLogged.current = pathname;

    fetch("/api/audit-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {
      // Silently ignore — audit logging should never break navigation
    });
  }, [pathname]);
}
