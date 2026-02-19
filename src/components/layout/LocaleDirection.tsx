"use client";

import { useEffect } from "react";

export function LocaleDirection({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  return <>{children}</>;
}
