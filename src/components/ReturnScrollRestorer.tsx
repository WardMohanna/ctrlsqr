"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const RETURN_SCROLL_KEY_PREFIX = "ctrlsqr:return-source:";

const escapeSelectorValue = (value: string) => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/"/g, '\\"');
};

export default function ReturnScrollRestorer() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || typeof window === "undefined") return;

    let sourcePath: string | null = null;
    try {
      sourcePath = sessionStorage.getItem(
        `${RETURN_SCROLL_KEY_PREFIX}${pathname}`,
      );
    } catch {
      sourcePath = null;
    }

    if (!sourcePath) return;

    let cancelled = false;

    const scrollToSourceCard = (attempt = 0) => {
      if (cancelled || !sourcePath) return;

      const selectorValue = escapeSelectorValue(sourcePath);
      const target = document.querySelector(
        `[data-return-path="${selectorValue}"]`,
      ) as HTMLElement | null;

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("return-scroll-target-highlight");
        window.setTimeout(() => {
          target.classList.remove("return-scroll-target-highlight");
        }, 1100);

        try {
          sessionStorage.removeItem(`${RETURN_SCROLL_KEY_PREFIX}${pathname}`);
        } catch {
          // ignore storage errors
        }
        return;
      }

      if (attempt < 15) {
        window.setTimeout(() => scrollToSourceCard(attempt + 1), 80);
      } else {
        try {
          sessionStorage.removeItem(`${RETURN_SCROLL_KEY_PREFIX}${pathname}`);
        } catch {
          // ignore storage errors
        }
      }
    };

    const id = window.requestAnimationFrame(() => scrollToSourceCard());

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
  }, [pathname]);

  return null;
}
