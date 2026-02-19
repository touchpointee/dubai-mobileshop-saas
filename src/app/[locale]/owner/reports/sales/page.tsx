"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2 } from "lucide-react";

type SaleRow = {
  _id: string;
  invoiceNumber: string;
  date: string;
  channel: string;
  total: number;
  soldBy?: { name?: string };
};

type SalesReport = {
  sales: SaleRow[];
  totalSales: number;
  vatCollected: number;
  invoiceCount: number;
};

export default function SalesReportPage() {
  const t = useTranslations("pages");
  const tTables = useTranslations("tables");
  const tErrors = useTranslations("errors");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [channel, setChannel] = useState("ALL");
  const [data, setData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (channel !== "ALL") params.set("channel", channel);
      const res = await fetch(`/api/reports/sales?${params}`);
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
      render: (r: SaleRow) => formatDate(r.date),
    },
    { key: "channel", header: tTables("channel") },
    {
      key: "total",
      header: tTables("total"),
      render: (r: SaleRow) => formatCurrency(r.total),
    },
    {
      key: "soldBy",
      header: tTables("soldBy"),
      render: (r: SaleRow) => r.soldBy?.name ?? "—",
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("salesReport")} />

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
          <div>
            <Label className="mb-1 block text-xs text-slate-500">
              {t("channel")}
            </Label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="flex h-9 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="ALL">{t("all")}</option>
              <option value="VAT">{t("vat")}</option>
              <option value="NON_VAT">{t("nonVat")}</option>
            </select>
          </div>
          <Button onClick={loadReport} disabled={loading}>
            {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
            {t("loadReport")}
          </Button>
        </div>

        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                title={t("totalSales")}
                value={formatCurrency(data.totalSales)}
              />
              <StatCard
                title={t("vatCollected")}
                value={formatCurrency(data.vatCollected)}
              />
              <StatCard
                title={t("invoices")}
                value={data.invoiceCount}
              />
            </div>

            <DataTable
              columns={columns}
              data={data.sales}
              emptyMessage={t("noSalesFound")}
            />
          </>
        )}
      </div>
    </div>
  );
}
