"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Loader2, Download } from "lucide-react";

type ProductStockDetail = {
  product: {
    _id: string;
    name: string;
    brand?: string;
    category?: string;
    channel: string;
    currentStock: number;
    requiresImei?: boolean;
    costPrice: number;
    sellPrice: number;
  };
  added: { date: string; invoiceNumber: string; quantity: number; costPrice: number; totalPrice: number }[];
  sold: { date: string; invoiceNumber: string; quantity: number; unitPrice: number; totalPrice: number; imei?: string }[];
  returned: { date: string; returnNumber: string; quantity: number }[];
};

export type StockRow = {
  _id: string;
  name: string;
  brand?: string;
  category?: string;
  channel: string;
  quantity: number;
  requiresImei?: boolean;
  imeiCount?: number;
  aged30Count?: number;
  aged60Count?: number;
  oldestStockAgeDays?: number;
  costPrice: number;
  sellPrice: number;
};

export type StockReport = {
  products: StockRow[];
  summary: {
    totalProducts: number;
    totalQuantity: number;
    aged30Units: number;
    aged60Units: number;
    totalValue: number;
  };
};

export function getStockQty(p: StockRow): number {
  return p.requiresImei ? (p.imeiCount ?? p.quantity ?? 0) : (p.quantity ?? 0);
}

export function getStockValue(p: StockRow): number {
  return (p.costPrice ?? 0) * getStockQty(p);
}

type ChannelFilter = "VAT" | "ALL";
type Branch = { _id: string; name: string; isDefault?: boolean; isActive?: boolean };

export function StockReportContent({
  title = "Stock Report",
  channel: initialChannel,
  showChannelSelector,
}: {
  title?: string;
  channel: ChannelFilter;
  showChannelSelector: boolean;
}) {
  const t = useTranslations("pages");
  const tTables = useTranslations("tables");
  const tForms = useTranslations("forms");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const [channel, setChannel] = useState<ChannelFilter>(initialChannel);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [data, setData] = useState<StockReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockRow | null>(null);
  const [detailData, setDetailData] = useState<ProductStockDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const effectiveChannel = showChannelSelector ? channel : initialChannel;

  useEffect(() => {
    fetch("/api/branches")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Branch[]) => {
        const active = data.filter((b) => b.isActive !== false);
        setBranches(active);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedProduct) {
      setDetailData(null);
      return;
    }
    setDetailLoading(true);
    setDetailData(null);
    fetch(`/api/reports/stock/${selectedProduct._id}`)
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Failed to load");
      })
      .then(setDetailData)
      .catch(() => alert(tErrors("failedToLoadDetail")))
      .finally(() => setDetailLoading(false));
  }, [selectedProduct, tErrors]);

  async function loadReport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ channel: effectiveChannel });
      if (branchId) params.set("branchId", branchId);
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

  function exportCsv() {
    if (!data?.products.length) return;
    const showChannel = effectiveChannel === "ALL";
    const headers = [
      tTables("product"),
      tTables("brand"),
      tTables("category"),
      ...(showChannel ? [tTables("channel")] : []),
      tTables("stock"),
      tTables("unit"),
      tTables("cost"),
      tTables("price"),
      tTables("stockValue"),
      "Oldest age",
      "30+ days",
      "60+ days",
    ];
    const rows = data.products.map((p) => {
      const qty = getStockQty(p);
      const unit = p.requiresImei ? "IMEI" : "pcs";
      const value = getStockValue(p);
      return [
        p.name,
        p.brand ?? "",
        p.category ?? "",
        ...(showChannel ? [p.channel === "VAT" ? "VAT" : "Non-VAT"] : []),
        String(qty),
        unit,
        String(p.costPrice ?? 0),
        String(p.sellPrice ?? 0),
        String(value),
        String(p.oldestStockAgeDays ?? 0),
        String(p.aged30Count ?? 0),
        String(p.aged60Count ?? 0),
      ];
    });
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const showChannelCol = effectiveChannel === "ALL";

  const columns = [
    { key: "name", header: tTables("product") },
    {
      key: "brand",
      header: tTables("brand"),
      render: (r: StockRow) => r.brand ?? "—",
    },
    {
      key: "category",
      header: tTables("category"),
      render: (r: StockRow) => r.category ?? "—",
    },
    ...(showChannelCol
      ? [
          {
            key: "channel",
            header: tTables("channel"),
            render: (r: StockRow) => (r.channel === "VAT" ? t("vat") : t("nonVat")),
          },
        ]
      : []),
    {
      key: "stock",
      header: tTables("stock"),
      render: (r: StockRow) => {
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
      render: (r: StockRow) => (r.requiresImei ? "IMEI" : "pcs"),
    },
    {
      key: "costPrice",
      header: tTables("cost"),
      render: (r: StockRow) => formatCurrency(r.costPrice ?? 0),
    },
    {
      key: "sellPrice",
      header: tTables("price"),
      render: (r: StockRow) => formatCurrency(r.sellPrice ?? 0),
    },
    {
      key: "stockValue",
      header: tTables("stockValue"),
      render: (r: StockRow) => formatCurrency(getStockValue(r)),
    },
    {
      key: "oldestStockAgeDays",
      header: "Age",
      render: (r: StockRow) => {
        const days = r.oldestStockAgeDays ?? 0;
        const tone = days >= 60 ? "text-red-600" : days >= 30 ? "text-amber-600" : "text-slate-600";
        return <span className={`font-medium ${tone}`}>{days}d</span>;
      },
    },
    {
      key: "aged30Count",
      header: "30+",
      render: (r: StockRow) => {
        const count = r.aged30Count ?? 0;
        return <span className={count > 0 ? "font-medium text-amber-600" : undefined}>{count}</span>;
      },
    },
    {
      key: "aged60Count",
      header: "60+",
      render: (r: StockRow) => {
        const count = r.aged60Count ?? 0;
        return <span className={count > 0 ? "font-medium text-red-600" : undefined}>{count}</span>;
      },
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title={title} />

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
                <option value="ALL">{t("combined")}</option>
              </select>
            </div>
          )}
          {branches.length > 0 && (
            <div>
              <Label className="mb-1 block text-xs text-slate-500">Branch</Label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="flex h-9 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>{branch.name}</option>
                ))}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard title={t("totalProducts")} value={String(data.summary.totalProducts)} />
              <StatCard title={t("totalUnits")} value={String(data.summary.totalQuantity)} />
              <StatCard title={t("stockValue")} value={formatCurrency(data.summary.totalValue)} />
              <StatCard title="30+ day stock" value={String(data.summary.aged30Units)} />
              <StatCard title="60+ day stock" value={String(data.summary.aged60Units)} />
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="touch" onClick={exportCsv} disabled={!data.products.length} className="min-h-[44px]">
                <Download size={18} className="me-2" />
                {t("exportCsv")}
              </Button>
            </div>

            <DataTable
              columns={columns}
              data={data.products}
              emptyMessage={t("noProductsInStock")}
              onRowClick={(row) => setSelectedProduct(row)}
            />
          </>
        )}
      </div>

      <Modal
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct ? t("stockDetailTitle", { name: selectedProduct.name }) : ""}
        size="xl"
      >
        {detailLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-teal-600" />
          </div>
        )}
        {!detailLoading && detailData && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="text-sm font-medium text-slate-600">{t("currentStock")}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {detailData.product.currentStock} {detailData.product.requiresImei ? "IMEI" : "pcs"}
              </p>
              <div className="mt-2 flex gap-4 text-sm text-slate-600">
                <span>{tTables("cost")}: {formatCurrency(detailData.product.costPrice)}</span>
                <span>{tTables("price")}: {formatCurrency(detailData.product.sellPrice)}</span>
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">{t("addedPurchases")}</p>
              {detailData.added.length === 0 ? (
                <p className="text-sm text-slate-500">{t("noPurchases")}</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-3 py-2 font-medium text-slate-600">{tTables("date")}</th>
                        <th className="px-3 py-2 font-medium text-slate-600">{tTables("invoice")}</th>
                        <th className="px-3 py-2 font-medium text-slate-600 text-right">{tTables("qty")}</th>
                        <th className="px-3 py-2 font-medium text-slate-600 text-right">{tTables("cost")}</th>
                        <th className="px-3 py-2 font-medium text-slate-600 text-right">{tTables("total")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.added.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="px-3 py-2">{formatDate(row.date)}</td>
                          <td className="px-3 py-2">{row.invoiceNumber}</td>
                          <td className="px-3 py-2 text-right">{row.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.costPrice)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">{t("sold")}</p>
              {detailData.sold.length === 0 ? (
                <p className="text-sm text-slate-500">{t("noSales")}</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-3 py-2 font-medium text-slate-600">{tTables("date")}</th>
                        <th className="px-3 py-2 font-medium text-slate-600">{tTables("invoice")}</th>
                        <th className="px-3 py-2 font-medium text-slate-600 text-right">{tTables("qty")}</th>
                        <th className="px-3 py-2 font-medium text-slate-600 text-right">{tTables("price")}</th>
                        <th className="px-3 py-2 font-medium text-slate-600 text-right">{tTables("total")}</th>
                        <th className="px-3 py-2 font-medium text-slate-600">IMEI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.sold.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="px-3 py-2">{formatDate(row.date)}</td>
                          <td className="px-3 py-2">{row.invoiceNumber}</td>
                          <td className="px-3 py-2 text-right">{row.quantity}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.unitPrice)}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(row.totalPrice)}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{row.imei ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">{t("returned")}</p>
              {detailData.returned.length === 0 ? (
                <p className="text-sm text-slate-500">{t("noReturns")}</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-3 py-2 font-medium text-slate-600">{tTables("date")}</th>
                        <th className="px-3 py-2 font-medium text-slate-600">{tForms("returnNumber")}</th>
                        <th className="px-3 py-2 font-medium text-slate-600 text-right">{tTables("qty")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.returned.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="px-3 py-2">{formatDate(row.date)}</td>
                          <td className="px-3 py-2">{row.returnNumber}</td>
                          <td className="px-3 py-2 text-right">{row.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <Button variant="outline" size="touch" onClick={() => setSelectedProduct(null)} className="min-h-[44px]">
                {tCommon("close")}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
