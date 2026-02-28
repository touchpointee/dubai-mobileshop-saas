"use client";

import useSWR from "swr";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { formatCurrency } from "@/lib/utils";

type Product = {
  _id: string;
  name: string;
  brand?: string;
  category?: string;
  sellPrice: number;
  minSellPrice?: number;
  quantity: number;
  requiresImei?: boolean;
  imeiCount?: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function QtyBadge({ qty }: { qty: number }) {
  const cls =
    qty === 0
      ? "bg-red-50 text-red-700 ring-red-600/20"
      : qty <= 5
        ? "bg-amber-50 text-amber-700 ring-amber-600/20"
        : "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {qty}
    </span>
  );
}

function getAvailableQty(p: Product): number {
  return p.requiresImei ? (p.imeiCount ?? p.quantity ?? 0) : p.quantity;
}

export function StaffProductsPageContent() {
  const { data: products, isLoading } = useSWR<Product[]>("/api/products?channel=VAT", fetcher);

  if (isLoading) return <PageSkeleton />;

  const columns = [
    { key: "name", header: "Name" },
    {
      key: "brand",
      header: "Brand",
      render: (p: Product) => <span className="text-slate-500">{p.brand || "—"}</span>,
    },
    {
      key: "category",
      header: "Category",
      render: (p: Product) => <span className="text-slate-500">{p.category || "—"}</span>,
    },
    {
      key: "quantity",
      header: "Qty",
      render: (p: Product) => (
        <span className="flex items-center gap-1.5">
          {p.requiresImei ? (
            <>
              <QtyBadge qty={p.imeiCount ?? p.quantity ?? 0} />
              <span className="text-[10px] text-slate-400">IMEI</span>
            </>
          ) : (
            <QtyBadge qty={p.quantity} />
          )}
        </span>
      ),
    },
    {
      key: "sellPrice",
      header: "Sell price",
      render: (p: Product) => <span className="font-medium">{formatCurrency(p.sellPrice)}</span>,
    },
    {
      key: "minSellPrice",
      header: "Min sell price",
      render: (p: Product) => (
        <span className="text-slate-500">
          {p.minSellPrice != null && p.minSellPrice > 0 ? formatCurrency(p.minSellPrice) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Products" description="View product stock and prices (read-only)" />
      <div className="px-6 pb-6">
        <DataTable columns={columns} data={products ?? []} emptyMessage="No products found." />
      </div>
    </div>
  );
}
