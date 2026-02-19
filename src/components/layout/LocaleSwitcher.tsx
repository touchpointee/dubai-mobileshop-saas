"use client";

import { usePathname, useRouter } from "next/navigation";

const locales = [
  { code: "en", label: "EN" },
  { code: "ar", label: "AR" },
];

export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(locale: string) {
    if (locale === currentLocale) return;
    const segments = pathname?.split("/") ?? [];
    const hasLocale = segments[1] && ["en", "ar"].includes(segments[1]);
    const pathWithoutLocale = hasLocale ? segments.slice(2).join("/") : segments.slice(1).join("/");
    const newPath = pathWithoutLocale ? `/${locale}/${pathWithoutLocale}` : `/${locale}`;
    router.push(newPath);
  }

  return (
    <div className="flex gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {locales.map((loc) => (
        <button
          key={loc.code}
          type="button"
          onClick={() => switchLocale(loc.code)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            currentLocale === loc.code
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {loc.label}
        </button>
      ))}
    </div>
  );
}
