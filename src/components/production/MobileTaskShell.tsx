"use client";

import { useRef, useState } from "react";

interface MobileTaskShellProps {
  taskId: string;
  children: React.ReactNode;
  onLongPress: () => void;
}

export function MobileTaskShell({
  taskId,
  children,
  onLongPress,
}: MobileTaskShellProps) {
  const [pressing, setPressing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setPressing(true);

    timerRef.current = setTimeout(() => {
      onLongPress();
      // Haptic feedback if available
      if ("vibrate" in navigator) {
        navigator.vibrate(50);
      }
    }, 550); // 550ms threshold for long press
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Cancel long press if finger moves too much (prevents accidental triggers during scrolling)
    if (!touchStartPos.current) return;

    const touch = e.touches[0];
    if (!touch) return;

    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);

    // If moved more than 10px, cancel the long press
    if (dx > 10 || dy > 10) {
      handleTouchEnd();
    }
  };

  const handleTouchEnd = () => {
    setPressing(false);
    touchStartPos.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        transform: pressing ? "scale(0.98)" : "scale(1)",
        opacity: pressing ? 0.8 : 1,
        transition: "transform 200ms ease-out, opacity 200ms ease-out",
      }}
    >
      {children}
    </div>
  );
}
