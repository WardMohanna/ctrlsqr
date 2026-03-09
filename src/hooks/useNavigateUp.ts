"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

// Parent routes that don't have direct pages in this app
const PARENT_FALLBACKS: Record<string, string> = {
  "/production": "/welcomePage",
  "/supplier": "/mainMenu",
  "/invoice": "/mainMenu",
  "/inventory": "/mainMenu",
};

/**
 * Returns a callback that navigates one level up in the URL hierarchy.
 *
 * For example:
 * - `/inventory/receive` -> `/inventory` -> `/mainMenu` (no /inventory page)
 * - `/supplier/list` -> `/supplier` -> `/mainMenu` (no /supplier page)
 * - `/production/tasks/create` -> `/production/tasks` -> `/mainMenu`
 *
 * If there is no parent segment (e.g. `/` or `""`), it will push to `/`.
 */
export function useNavigateUp() {
  const router = useRouter();
  const pathname = usePathname();

  const goUp = useCallback(() => {
    const currentPath =
      (typeof window !== "undefined" ? window.location.pathname : pathname) ||
      pathname;

    if (!currentPath) {
      router.push("/");
      return;
    }

    const segments = currentPath.split("/").filter(Boolean);

    if (segments.length <= 1) {
      router.push("/");
      return;
    }

    segments.pop();
    const nextPath = "/" + segments.join("/");
    const fallbackPath = PARENT_FALLBACKS[nextPath];

    if (fallbackPath) {
      router.push(fallbackPath);
    } else {
      router.push(nextPath);
    }
  }, [pathname, router]);

  return goUp;
}
