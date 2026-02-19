"use client";

import useSWR from "swr";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardSkeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  BarChart3,
  FileText,
  Truck,
  Package,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type DashboardData = {
  todaySales: { vat: number; nonVat: number; total: number };
  monthSales: { vat: number; nonVat: number; total: number };
  monthVatCollected: number;
  outstandingDealerBalance: number;
  lowStockCount: number;
};

export default function DashboardPage() {
  const t = useTranslations("pages");
  const locale = useLocale() as string;
  const { data, isLoading } = useSWR<DashboardData>(
    "/api/reports/dashboard",
    fetcher
  );

  if (isLoading || !data) return <DashboardSkeleton />;

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("dashboard")} />

      <div className="px-6 pb-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatCard
            title={t("todaySales")}
            value={formatCurrency(data.todaySales.total)}
            subtitle={`${t("vat")} ${formatCurrency(data.todaySales.vat)} · ${t("nonVat")} ${formatCurrency(data.todaySales.nonVat)}`}
            icon={<TrendingUp size={20} />}
          />
          <StatCard
            title={t("thisMonth")}
            value={formatCurrency(data.monthSales.total)}
            subtitle={`${t("vat")} ${formatCurrency(data.monthSales.vat)} · ${t("nonVat")} ${formatCurrency(data.monthSales.nonVat)}`}
            icon={<BarChart3 size={20} />}
          />
          <StatCard
            title={t("vatCollected")}
            value={formatCurrency(data.monthVatCollected)}
            subtitle={t("thisMonthLabel")}
            icon={<FileText size={20} />}
          />
          <StatCard
            title={t("outstandingDealers")}
            value={formatCurrency(data.outstandingDealerBalance)}
            icon={<Truck size={20} />}
          />
          <StatCard
            title={t("lowStock")}
            value={data.lowStockCount}
            subtitle={t("itemsBelowThreshold")}
            icon={<Package size={20} />}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">
            {t("quickLinks")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <QuickLink
              href={`/${locale}/owner/reports/sales`}
              icon={<BarChart3 size={18} />}
              labelKey="pages.salesReport"
            />
            <QuickLink
              href={`/${locale}/owner/reports/vat`}
              icon={<FileText size={18} />}
              labelKey="pages.vatReport"
            />
            <QuickLink
              href={`/${locale}/owner/reports/profit-loss`}
              icon={<TrendingUp size={18} />}
              labelKey="pages.profitLoss"
            />
            <QuickLink
              href={`/${locale}/owner/expenses`}
              icon={<Truck size={18} />}
              labelKey="pages.expenses"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  labelKey,
}: {
  href: string;
  icon: React.ReactNode;
  labelKey: string;
}) {
  const t = useTranslations();
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-700"
    >
      <span className="text-teal-600">{icon}</span>
      {t(labelKey)}
    </Link>
  );
}
