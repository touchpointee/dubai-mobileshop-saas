"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import type { Role } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "./LocaleSwitcher";

const NAV_BY_ROLE: Record<
  Role,
  { href: string; labelKey: string }[]
> = {
  SUPER_ADMIN: [
    { href: "/super-admin/dashboard", labelKey: "nav.dashboard" },
    { href: "/super-admin/shops", labelKey: "Shops" },
    { href: "/super-admin/users", labelKey: "Users" },
  ],
  OWNER: [
    { href: "/owner/dashboard", labelKey: "nav.dashboard" },
    { href: "/owner/reports/sales", labelKey: "nav.reports" },
    { href: "/owner/reports/vat", labelKey: "VAT Report" },
    { href: "/owner/reports/profit-loss", labelKey: "P&L" },
    { href: "/owner/expenses", labelKey: "nav.expenses" },
    { href: "/owner/salary", labelKey: "Salary" },
    { href: "/owner/settings", labelKey: "nav.settings" },
  ],
  VAT_STAFF: [
    { href: "/vat/pos", labelKey: "nav.pos" },
    { href: "/vat/products", labelKey: "nav.products" },
    { href: "/vat/dealers", labelKey: "nav.dealers" },
    { href: "/vat/customers", labelKey: "nav.customers" },
    { href: "/vat/purchases", labelKey: "nav.purchases" },
    { href: "/vat/sales", labelKey: "nav.sales" },
    { href: "/vat/returns", labelKey: "nav.returns" },
    { href: "/vat/settings", labelKey: "nav.settings" },
  ],
  NON_VAT_STAFF: [
    { href: "/non-vat/pos", labelKey: "nav.pos" },
    { href: "/non-vat/products", labelKey: "nav.products" },
    { href: "/non-vat/dealers", labelKey: "nav.dealers" },
    { href: "/non-vat/customers", labelKey: "nav.customers" },
    { href: "/non-vat/purchases", labelKey: "nav.purchases" },
    { href: "/non-vat/sales", labelKey: "nav.sales" },
    { href: "/non-vat/returns", labelKey: "nav.returns" },
    { href: "/non-vat/settings", labelKey: "nav.settings" },
  ],
  STAFF: [
    { href: "/staff/pos", labelKey: "nav.pos" },
    { href: "/staff/products", labelKey: "nav.products" },
    { href: "/staff/returns", labelKey: "nav.returns" },
    { href: "/staff/customers", labelKey: "nav.customers" },
    { href: "/staff/service", labelKey: "nav.service" },
  ],
};

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();
  const items = NAV_BY_ROLE[role];

  return (
    <aside className="flex w-56 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <span className="font-semibold text-gray-800">Dubai Mobile Shop POS</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {items.map((item) => {
          const label = item.labelKey.startsWith("nav.")
            ? t(item.labelKey as "nav.dashboard")
            : item.labelKey;
          const isActive = pathname?.includes(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 p-2 space-y-2">
        <div className="flex justify-center">
          <LocaleSwitcher currentLocale={locale} />
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: `${window.location.origin}/${locale}/login` })}
          className="w-full rounded px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          {t("common.logout")}
        </button>
      </div>
    </aside>
  );
}
