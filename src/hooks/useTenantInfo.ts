"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface TenantInfo {
  name: string;
  logo: string | null;
}

export function useTenantInfo() {
  const { data: session, status } = useSession();
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/tenant/info")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tenant) setTenantInfo(data.tenant);
      })
      .catch(() => {});
  }, [status]);

  return tenantInfo;
}
