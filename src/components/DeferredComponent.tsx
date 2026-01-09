"use client";

import { useState, useEffect, ReactNode } from "react";

interface DeferredComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Defers rendering of children until after initial paint
 * This prevents heavy components from blocking first interaction
 */
export default function DeferredComponent({ children, fallback = null }: DeferredComponentProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Defer rendering until after hydration
    const timer = setTimeout(() => setIsReady(true), 0);
    return () => clearTimeout(timer);
  }, []);

  return isReady ? <>{children}</> : <>{fallback}</>;
}
