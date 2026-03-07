"use client";

import { NextIntlClientProvider } from "next-intl";
import { memo, useMemo } from "react";
import { useLocale } from "@/hooks/useLocale";
import heMessages from "../../messages/he.json";
import enMessages from "../../messages/en.json";
import arMessages from "../../messages/ar.json";
import ruMessages from "../../messages/ru.json";

const MESSAGES_BY_LOCALE = {
  he: heMessages,
  en: enMessages,
  ar: arMessages,
  ru: ruMessages,
} as const;

const IntlProviderWrapper = memo(function IntlProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale } = useLocale();

  // Memoize messages to prevent re-parsing
  const memoizedMessages = useMemo(() => MESSAGES_BY_LOCALE[locale], [locale]);

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
