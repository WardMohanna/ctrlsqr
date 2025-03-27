"use client";

import { NextIntlClientProvider } from "next-intl";

interface IntlProviderWrapperProps {
  messages: Record<string, any>;
  locale: string;
  children: React.ReactNode;
}

export default function IntlProviderWrapper({
  messages,
  locale,
  children,
}: IntlProviderWrapperProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
