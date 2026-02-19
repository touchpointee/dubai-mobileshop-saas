"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import type { Role } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useNavigationStore } from "@/stores/navigation-store";
import { LocaleSwitcher } from "./LocaleSwitcher";
import {
  LayoutDashboard,
  Store,
  Users,
  ShoppingCart,
  Package,
  Layers,
  Tags,
  Truck,
  UserCircle,
  Receipt,
  RotateCcw,
  Settings,
  BarChart3,
  FileText,
  TrendingUp,
  Wallet,
  CreditCard,
  LogOut,
  Wrench,
} from "lucide-react";

const ICON_SIZE = 20;

type NavSection = {
  sectionKey: string;
  items: { href: string; labelKey: string; icon: React.ReactNode }[];
};

const NAV_BY_ROLE: Record<Role, NavSection[]> = {
  SUPER_ADMIN: [
    {
      sectionKey: "nav.sectionMain",
      items: [
        { href: "/super-admin/dashboard", labelKey: "nav.dashboard", icon: <LayoutDashboard size={ICON_SIZE} /> },
        { href: "/super-admin/shops", labelKey: "nav.shops", icon: <Store size={ICON_SIZE} /> },
        { href: "/super-admin/users", labelKey: "nav.users", icon: <Users size={ICON_SIZE} /> },
      ],
    },
  ],
  OWNER: [
    {
      sectionKey: "nav.sectionMain",
      items: [
        { href: "/owner/dashboard", labelKey: "nav.dashboard", icon: <LayoutDashboard size={ICON_SIZE} /> },
        { href: "/owner/service", labelKey: "nav.service", icon: <Wrench size={ICON_SIZE} /> },
      ],
    },
    {
      sectionKey: "nav.sectionReports",
      items: [
        { href: "/owner/reports/sales", labelKey: "nav.salesReport", icon: <BarChart3 size={ICON_SIZE} /> },
        { href: "/owner/reports/vat", labelKey: "nav.vatReport", icon: <FileText size={ICON_SIZE} /> },
        { href: "/owner/reports/profit-loss", labelKey: "nav.profitLoss", icon: <TrendingUp size={ICON_SIZE} /> },
        { href: "/owner/reports/stock", labelKey: "nav.stockReport", icon: <Layers size={ICON_SIZE} /> },
      ],
    },
    {
      sectionKey: "nav.sectionFinance",
      items: [
        { href: "/owner/expenses", labelKey: "nav.expenses", icon: <Wallet size={ICON_SIZE} /> },
        { href: "/owner/salary", labelKey: "nav.salary", icon: <CreditCard size={ICON_SIZE} /> },
      ],
    },
    {
      sectionKey: "nav.sectionSettings",
      items: [
        { href: "/owner/settings", labelKey: "nav.settings", icon: <Settings size={ICON_SIZE} /> },
      ],
    },
  ],
  VAT_STAFF: [
    {
      sectionKey: "nav.sectionSell",
      items: [
        { href: "/vat/pos", labelKey: "nav.pos", icon: <ShoppingCart size={ICON_SIZE} /> },
      ],
    },
    {
      sectionKey: "nav.sectionInventory",
      items: [
        { href: "/vat/products", labelKey: "nav.products", icon: <Package size={ICON_SIZE} /> },
        { href: "/vat/stock", labelKey: "nav.stock", icon: <Layers size={ICON_SIZE} /> },
        { href: "/vat/categories", labelKey: "nav.categories", icon: <Tags size={ICON_SIZE} /> },
      ],
    },
    {
      sectionKey: "nav.sectionPartners",
      items: [
        { href: "/vat/dealers", labelKey: "nav.dealers", icon: <Truck size={ICON_SIZE} /> },
        { href: "/vat/customers", labelKey: "nav.customers", icon: <UserCircle size={ICON_SIZE} /> },
      ],
    },
    {
      sectionKey: "nav.sectionTransactions",
      items: [
        { href: "/vat/purchases", labelKey: "nav.purchases", icon: <Receipt size={ICON_SIZE} /> },
        { href: "/vat/sales", labelKey: "nav.sales", icon: <BarChart3 size={ICON_SIZE} /> },
        { href: "/vat/returns", labelKey: "nav.returns", icon: <RotateCcw size={ICON_SIZE} /> },
      ],
    },
    {
      sectionKey: "nav.sectionMain",
      items: [
        { href: "/vat/service", labelKey: "nav.service", icon: <Wrench size={ICON_SIZE} /> },
      ],
    },
    {
      sectionKey: "nav.sectionSettings",
      items: [
        { href: "/vat/settings", labelKey: "nav.settings", icon: <Settings size={ICON_SIZE} /> },
      ],
    },
  ],
  NON_VAT_STAFF: [
    {
      sectionKey: "nav.sectionSell",
      items: [
        { href: "/non-vat/pos", labelKey: "nav.pos", icon: <ShoppingCart size={ICON_SIZE} /> },
      ],
    },
    {
      sectionKey: "nav.sectionInventory",
      items: [
        { href: "/non-vat/products", labelKey: "nav.products", icon: <Package size={ICON_SIZE} /> },
        { href: "/non-vat/stock", labelKey: "nav.stock", icon: <Layers size={ICON_SIZE} /> },
        { href: "/non-vat/categories", labelKey: "nav.categories", icon: <Tags size={ICON_SIZE} /> },
      ],
    },
    {
      sectionKey: "nav.sectionPartners",
      items: [
        { href: "/non-vat/dealers", labelKey: "nav.dealers", icon: <Truck size={ICON_SIZE} /> },
        { href: "/non-vat/customers", labelKey: "nav.customers", icon: <UserCircle size={ICON_SIZE} /> },
      ],
    },
    {
      sectionKey: "nav.sectionTransactions",
      items: [
        { href: "/non-vat/purchases", labelKey: "nav.purchases", icon: <Receipt size={ICON_SIZE} /> },
        { href: "/non-vat/sales", labelKey: "nav.sales", icon: <BarChart3 size={ICON_SIZE} /> },
        { href: "/non-vat/returns", labelKey: "nav.returns", icon: <RotateCcw size={ICON_SIZE} /> },
      ],
    },
    {
      sectionKey: "nav.sectionMain",
      items: [
        { href: "/non-vat/service", labelKey: "nav.service", icon: <Wrench size={ICON_SIZE} /> },
      ],
    },
    {
      sectionKey: "nav.sectionSettings",
      items: [
        { href: "/non-vat/settings", labelKey: "nav.settings", icon: <Settings size={ICON_SIZE} /> },
      ],
    },
  ],
  STAFF: [
    {
      sectionKey: "nav.sectionMain",
      items: [
        { href: "/staff/pos", labelKey: "nav.pos", icon: <ShoppingCart size={ICON_SIZE} /> },
        { href: "/staff/products", labelKey: "nav.products", icon: <Package size={ICON_SIZE} /> },
        { href: "/staff/service", labelKey: "nav.service", icon: <Wrench size={ICON_SIZE} /> },
        { href: "/staff/customers", labelKey: "nav.customers", icon: <UserCircle size={ICON_SIZE} /> },
        { href: "/staff/returns", labelKey: "nav.returns", icon: <RotateCcw size={ICON_SIZE} /> },
      ],
    },
  ],
};

export function AppSidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const t = useTranslations();
  const locale = useLocale();
  const sections = NAV_BY_ROLE[role];
  const setNavigating = useNavigationStore((s) => s.setNavigating);
  const roleLabelKey = `roleLabels.${role}` as "roleLabels.OWNER" | "roleLabels.VAT_STAFF" | "roleLabels.NON_VAT_STAFF" | "roleLabels.STAFF" | "roleLabels.SUPER_ADMIN";

  return (
    <aside className="flex h-full min-h-0 w-72 shrink-0 flex-col border-e border-slate-200 bg-white">
      <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-teal-600 text-sm font-bold text-white">
          {t("app.name")}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-900">{t(roleLabelKey)}</p>
          <p className="text-xs text-slate-400">{t("app.subtitle")}</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.sectionKey}>
              <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400" role="heading" aria-level={2}>
                {t(section.sectionKey)}
              </h2>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const localePath = `/${locale}${item.href}`;
                  const isActive = pathname === localePath || pathname?.startsWith(`${localePath}/`);
                  return (
                    <Link
                      key={item.href}
                      href={localePath}
                      onClick={() => !isActive && setNavigating(true)}
                      className={cn(
                        "flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-3 text-base font-medium transition-colors",
                        isActive
                          ? "bg-teal-50 text-teal-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <span className={cn("flex-shrink-0", isActive ? "text-teal-600" : "text-slate-400")}>
                        {item.icon}
                      </span>
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-slate-100 px-3 py-4 space-y-3">
        <div className="flex justify-center">
          <LocaleSwitcher currentLocale={locale} />
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
          className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-3 text-base font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
        >
          <LogOut size={ICON_SIZE} className="flex-shrink-0" />
          {t("common.logout")}
        </button>
      </div>
    </aside>
  );
}
