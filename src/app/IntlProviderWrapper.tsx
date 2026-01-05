"use client";

import { NextIntlClientProvider } from "next-intl";
import { memo, useMemo } from "react";

interface IntlProviderWrapperProps {
  messages: Record<string, any>;
  locale: string;
  children: React.ReactNode;
}

const IntlProviderWrapper = memo(function IntlProviderWrapper({
  messages,
  locale,
  children,
}: IntlProviderWrapperProps) {
  // Memoize messages to prevent re-parsing
  const memoizedMessages = useMemo(() => messages, [messages]);
  
  return (
    <NextIntlClientProvider 
      locale={locale} 
      messages={memoizedMessages}
      timeZone="Asia/Jerusalem"
      // Critical: don't throw errors, just show keys
      onError={() => {}}
      getMessageFallback={({ key }) => key}
    >
      {children}
    </NextIntlClientProvider>
  );
});

export default IntlProviderWrapper;
