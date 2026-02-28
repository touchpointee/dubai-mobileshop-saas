"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export type StaffStockRow = {
  _id: string;
  name: string;
  brand?: string;
  category?: string;
  channel: string;
  quantity: number;
  requiresImei?: boolean;
  imeiCount?: number;
};

export type StaffStockResponse = {
  products: StaffStockRow[];
  summary: {
    totalProducts: number;
    totalQuantity: number;
    totalValue?: number;
  };
};

function getStockQty(p: StaffStockRow): number {
  return p.requiresImei ? (p.imeiCount ?? p.quantity ?? 0) : (p.quantity ?? 0);
}

type ChannelFilter = "VAT" | "NON_VAT" | "ALL";

export function StaffStockContent({
  title,
  channel: initialChannel,
  showChannelSelector = false,
}: {
  title?: string;
  channel: ChannelFilter;
  showChannelSelector?: boolean;
}) {
  const t = useTranslations("pages");
  const tTables = useTranslations("tables");
  const tErrors = useTranslations("errors");
  const [channel, setChannel] = useState<ChannelFilter>(initialChannel);
  const [data, setData] = useState<StaffStockResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const effectiveChannel = showChannelSelector ? channel : initialChannel;

  async function loadReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ channel: effectiveChannel });
      const res = await fetch(`/api/reports/stock?${params}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        alert(tErrors("failedToLoad"));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ channel: effectiveChannel });
    fetch(`/api/reports/stock?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to load"))))
      .then((d: StaffStockResponse) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) alert(tErrors("failedToLoad"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [effectiveChannel, tErrors]);

  const showChannelCol = effectiveChannel === "ALL";

  const columns = [
    { key: "name", header: tTables("product") },
    {
      key: "brand",
      header: tTables("brand"),
      render: (r: StaffStockRow) => r.brand ?? "—",
    },
    {
      key: "category",
      header: tTables("category"),
      render: (r: StaffStockRow) => r.category ?? "—",
    },
    ...(showChannelCol
      ? [
          {
            key: "channel",
            header: tTables("channel"),
            render: (r: StaffStockRow) => (r.channel === "VAT" ? t("vat") : t("nonVat")),
          },
        ]
      : []),
    {
      key: "stock",
      header: tTables("stock"),
      render: (r: StaffStockRow) => {
        const qty = getStockQty(r);
        const low = qty <= 2;
        return (
          <span className={low ? "font-medium text-amber-600" : undefined}>
            {qty}
            {low && qty > 0 ? " (low)" : ""}
          </span>
        );
      },
    },
    {
      key: "unit",
      header: tTables("unit"),
      render: (r: StaffStockRow) => (r.requiresImei ? "IMEI" : "pcs"),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title={title ?? t("stockReport")} />

      <div className="px-6 pb-6 space-y-6">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          {showChannelSelector && (
            <div>
              <Label className="mb-1 block text-xs text-slate-500">{t("channel")}</Label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as ChannelFilter)}
                className="flex h-9 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="VAT">{t("vat")}</option>
                <option value="NON_VAT">{t("nonVat")}</option>
                <option value="ALL">{t("combined")}</option>
              </select>
            </div>
          )}
          <Button onClick={loadReport} disabled={loading}>
            {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
            {t("loadReport")}
          </Button>
        </div>

        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard title={t("totalProducts")} value={String(data.summary.totalProducts)} />
              <StatCard title={t("totalUnits")} value={String(data.summary.totalQuantity)} />
            </div>

            <DataTable
              columns={columns}
              data={data.products}
              emptyMessage={t("noProductsInStock")}
            />
          </>
        )}
      </div>
    </div>
  );
}
