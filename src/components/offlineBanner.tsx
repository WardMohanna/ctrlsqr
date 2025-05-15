// components/OfflineBanner.tsx
import React from 'react';
import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  // Start off assuming the browser’s current online state
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // Handlers to update state
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);

    // Clean up
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return isOnline;
}


export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed top-0 inset-x-0 bg-red-600 text-white text-center py-2 z-50">
      You’re offline — some features may not work.
    </div>
  );
}
