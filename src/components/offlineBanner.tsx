// components/OfflineBanner.tsx
import React from 'react';
import { useOnlineStatus } from '@/lib/useOnlineStatus';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed top-0 inset-x-0 bg-red-600 text-white text-center py-2 z-50">
      You’re offline — some features may not work.
    </div>
  );
}
