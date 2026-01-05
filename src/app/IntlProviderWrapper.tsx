"use client";

import { NextIntlClientProvider } from "next-intl";
import { memo } from "react";

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
  return (
    <NextIntlClientProvider 
      locale={locale} 
      messages={messages}
      timeZone="Asia/Jerusalem"
    >
      {children}
    </NextIntlClientProvider>
  );
});

export default IntlProviderWrapper;
