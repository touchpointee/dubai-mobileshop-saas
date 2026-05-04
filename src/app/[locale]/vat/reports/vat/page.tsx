"use client";

import { useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Printer } from "lucide-react";

type VatRow = {
  _id: string;
  invoiceNumber: string;
  date: string;
  vatableAmount: number;
  vatAmount: number;
  normalVatAmount: number;
  marginSchemeVatAmount: number;
  hasMarginSchemeItems: boolean;
  total: number;
};

type VatReport = {
  rows: VatRow[];
  totalVatable: number;
  totalVat: number;
  totalNormalVat: number;
  totalMarginSchemeVat: number;
  totalSales: number;
  marginSchemeInvoiceCount: number;
  invoiceCount: number;
};

type Branch = { _id: string; name: string; isActive?: boolean };
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function VatReportPage() {
  const t = useTranslations("pages");
  const tTables = useTranslations("tables");
  const tErrors = useTranslations("errors");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<VatReport | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: branches = [] } = useSWR<Branch[]>("/api/branches", fetcher);

  async function loadReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (branchId) params.set("branchId", branchId);
      const res = await fetch(`/api/reports/vat?${params}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        alert(tErrors("failedToLoad"));
      }
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    { key: "invoiceNumber", header: tTables("invoice") },
    {
      key: "date",
      header: tTables("date"),
      render: (r: VatRow) => formatDate(r.date),
    },
    {
      key: "vatableAmount",
      header: t("totalVatable"),
      render: (r: VatRow) => formatCurrency(r.vatableAmount),
    },
    {
      key: "normalVatAmount",
      header: "Normal VAT",
      render: (r: VatRow) => formatCurrency(r.normalVatAmount),
    },
    {
      key: "marginSchemeVatAmount",
      header: "Margin VAT",
      render: (r: VatRow) => formatCurrency(r.marginSchemeVatAmount),
    },
    {
      key: "vatAmount",
      header: t("vat"),
      render: (r: VatRow) => formatCurrency(r.vatAmount),
    },
    {
      key: "total",
      header: tTables("total"),
      render: (r: VatRow) => formatCurrency(r.total),
    },
  ];

  return (
    <div className="animate-fade-in report-print-area">
      <PageHeader title={t("vatReport")}>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
          <Printer size={16} className="mr-1.5" />
          {t("printReport")}
        </Button>
      </PageHeader>

      <div className="px-6 pb-6 space-y-6">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <Label className="mb-1 block text-xs text-slate-500">{t("from")}</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-slate-500">{t("to")}</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={loadReport} disabled={loading}>
            {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
            {t("loadReport")}
          </Button>
          {branches.length > 0 && (
            <div>
              <Label className="mb-1 block text-xs text-slate-500">Branch</Label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="flex h-9 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">All branches</option>
                {branches.filter((b) => b.isActive !== false).map((branch) => (
                  <option key={branch._id} value={branch._id}>{branch.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title={t("totalVatable")}
                value={formatCurrency(data.totalVatable)}
              />
              <StatCard
                title={t("vatCollected")}
                value={formatCurrency(data.totalVat)}
              />
              <StatCard
                title={t("totalSales")}
                value={formatCurrency(data.totalSales)}
              />
              <StatCard
                title={t("invoices")}
                value={data.invoiceCount}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                title="Normal VAT"
                value={formatCurrency(data.totalNormalVat)}
              />
              <StatCard
                title="Margin Scheme VAT"
                value={formatCurrency(data.totalMarginSchemeVat)}
              />
              <StatCard
                title="Margin Scheme Invoices"
                value={data.marginSchemeInvoiceCount}
              />
            </div>

            <DataTable
              columns={columns}
              data={data.rows}
              emptyMessage={t("noVatInvoices")}
            />
          </>
        )}
      </div>
    </div>
  );
}
