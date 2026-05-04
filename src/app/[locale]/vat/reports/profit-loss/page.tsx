"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Printer } from "lucide-react";

type PnLData = {
  revenue: number;
  vatCollected: number;
  cogs: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
};

export default function ProfitLossPage() {
  const t = useTranslations("pages");
  const tErrors = useTranslations("errors");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/reports/profit-loss?${params}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        alert(tErrors("failedToLoad"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in report-print-area">
      <PageHeader title={t("profitLoss")}>
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
        </div>

        {data && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="divide-y divide-slate-100">
              <Row
                label={t("revenue")}
                value={formatCurrency(data.revenue)}
                className="text-slate-900"
              />
              <Row
                label={t("vatCollected")}
                value={formatCurrency(data.vatCollected)}
                className="text-slate-500"
              />
              <Row
                label="COGS"
                value={`- ${formatCurrency(data.cogs)}`}
                className="text-amber-600"
              />
              <Row
                label={t("expensesLabel")}
                value={`- ${formatCurrency(data.expenses)}`}
                className="text-red-600"
              />
              <div className="flex items-center justify-between px-6 py-5 bg-slate-50/60">
                <span className="text-lg font-bold text-slate-900">
                  {t("grossProfit")}
                </span>
                <span
                  className={`text-2xl font-bold ${
                    data.grossProfit >= 0 ? "text-teal-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(data.grossProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between px-6 py-5">
                <span className="text-lg font-bold text-slate-900">Net Profit</span>
                <span className={`text-2xl font-bold ${data.netProfit >= 0 ? "text-teal-600" : "text-red-600"}`}>
                  {formatCurrency(data.netProfit)}
                </span>
              </div>
            </div>
          </div>
        )}

        {data && (
          <p className="text-xs text-slate-400">
            {t("profitLossDescription")}
          </p>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className={`text-sm font-semibold ${className}`}>{value}</span>
    </div>
  );
}
