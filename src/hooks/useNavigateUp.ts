"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

// Parent routes that don't have direct pages in this app
const PARENT_FALLBACKS: Record<string, string> = {
  "/production": "/welcomePage",
  "/supplier": "/mainMenu",
  "/invoice": "/mainMenu",
  "/inventory": "/mainMenu",
  "/accounts": "/accounts/list",
  "/sales": "/mainMenu",
};

const RETURN_SCROLL_KEY_PREFIX = "ctrlsqr:return-source:";

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
    const dynamicFallbackPath = /^\/accounts\/[^/]+$/.test(nextPath)
      ? "/accounts/list"
      : undefined;
    const fallbackPath = dynamicFallbackPath || PARENT_FALLBACKS[nextPath];
    const destinationPath = fallbackPath || nextPath;

    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          `${RETURN_SCROLL_KEY_PREFIX}${destinationPath}`,
          currentPath,
        );
      } catch (error) {
        console.error("Failed to save return scroll metadata", error);
      }
    }

    if (fallbackPath) {
      router.push(fallbackPath);
    } else {
      router.push(nextPath);
    }
  }, [pathname, router]);

  return goUp;
}
