"use client";

import useSWR from "swr";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Store, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DashboardSkeleton } from "@/components/ui/skeleton";

type Stats = { shopsCount: number; usersCount: number };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

export default function DashboardPage() {
  const t = useTranslations("pages");
  const { data, isLoading } = useSWR<Stats>("/api/super-admin/stats", fetcher);

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("dashboard")} description={t("superAdminOverview")} />

      <div className="px-6 pb-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/super-admin/shops">
            <StatCard
              title={t("totalShops")}
              value={data?.shopsCount ?? 0}
              subtitle={t("manageAllShops")}
              icon={<Store size={20} />}
            />
          </Link>
          <Link href="/super-admin/users">
            <StatCard
              title={t("totalUsers")}
              value={data?.usersCount ?? 0}
              subtitle={t("manageAllUsers")}
              icon={<Users size={20} />}
            />
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">
            {t("subdomainRouting")}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {t("eachShopGetsSubdomain")}{" "}
            <code className="rounded bg-teal-50 px-1.5 py-0.5 text-xs font-medium text-teal-700">
              shopname.{ROOT_DOMAIN}
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
