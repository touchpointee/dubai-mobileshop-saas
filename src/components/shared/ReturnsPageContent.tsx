"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Search, ArrowLeft, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Channel } from "@/lib/constants";

type SaleItem = {
  _id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  totalPrice: number;
  imeiId?: string;
  imei?: string;
};

type Sale = {
  _id: string;
  invoiceNumber: string;
  saleDate: string;
  customerName?: string;
  items: SaleItem[];
  grandTotal: number;
  channel: string;
  status: string;
};

type ReturnDoc = {
  _id: string;
  returnNumber: string;
  saleId: { invoiceNumber: string };
  totalAmount: number;
  returnDate: string;
  status: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ReturnsPageContent({ channel }: { channel: Channel }) {
  const returnsKey = `/api/returns?channel=${channel}`;
  const { data: returns, isLoading } = useSWR<ReturnDoc[]>(returnsKey, fetcher);

  const [step, setStep] = useState<"search" | "select" | "confirm">("search");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [loadingAllSales, setLoadingAllSales] = useState(false);
  const [sales, setSales] = useState<Sale[]>([]);
  const [showAllSales, setShowAllSales] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<{ item: SaleItem; qty: number; total: number }[]>([]);
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function searchSales() {
    if (!invoiceSearch.trim()) return;
    setSearching(true);
    setShowAllSales(false);
    try {
      const res = await fetch(`/api/sales?channel=${channel}`);
      if (!res.ok) return;
      const list: Sale[] = await res.json();
      const q = invoiceSearch.trim().toLowerCase();
      const filtered = list.filter(
        (s) =>
          s.invoiceNumber.toLowerCase().includes(q) ||
          (s.customerName && s.customerName.toLowerCase().includes(q))
      );
      setSales(filtered.slice(0, 20));
      setStep("select");
    } finally {
      setSearching(false);
    }
  }

  async function openAddReturn() {
    setLoadingAllSales(true);
    setShowAllSales(true);
    setInvoiceSearch("");
    try {
      const res = await fetch(`/api/sales?channel=${channel}`);
      if (!res.ok) return;
      const list: Sale[] = await res.json();
      setSales(list.slice(0, 200));
      setStep("select");
    } finally {
      setLoadingAllSales(false);
    }
  }

  function selectSale(sale: Sale) {
    setSelectedSale(sale);
    setReturnItems(
      sale.items.map((item) => ({
        item,
        qty: item.quantity,
        total: item.totalPrice,
      }))
    );
    setReason("");
    setRefundMethod("");
    setStep("confirm");
  }

  function updateReturnQty(index: number, qty: number) {
    const entry = returnItems[index];
    if (!entry) return;
    const maxQty = entry.item.quantity;
    const newQty = Math.max(0, Math.min(qty, maxQty));
    const unitTotal = entry.item.quantity > 0 ? entry.item.totalPrice / entry.item.quantity : entry.item.unitPrice;
    const total = Math.round(unitTotal * newQty * 100) / 100;
    setReturnItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], qty: newQty, total };
      return next;
    });
  }

  const returnTotal = returnItems.reduce((sum, r) => sum + r.total, 0);

  async function submitReturn() {
    const toReturn = returnItems.filter((r) => r.qty > 0);
    if (toReturn.length === 0) {
      alert("Select at least one item to return");
      return;
    }
    if (!selectedSale) return;
    setSubmitting(true);
    try {
      const items = toReturn.map((r) => ({
        productId: r.item.productId,
        productName: r.item.productName,
        imeiId: r.item.imeiId,
        imei: r.item.imei,
        quantity: r.qty,
        unitPrice: r.item.unitPrice,
        totalPrice: r.total,
      }));
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saleId: selectedSale._id,
          items,
          reason,
          refundMethod,
        }),
      });
      if (res.ok) {
        resetFlow();
        mutate(returnsKey);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Error processing return");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetFlow() {
    setStep("search");
    setSelectedSale(null);
    setInvoiceSearch("");
    setSales([]);
    setShowAllSales(false);
    setReason("");
    setRefundMethod("");
  }

  if (isLoading) return <PageSkeleton />;

  const returnColumns = [
    { key: "returnNumber", header: "Return #" },
    {
      key: "saleId",
      header: "Invoice",
      render: (r: ReturnDoc) => (typeof r.saleId === "object" ? r.saleId?.invoiceNumber : "—"),
    },
    {
      key: "totalAmount",
      header: "Amount",
      render: (r: ReturnDoc) => <span className="font-medium">{formatCurrency(r.totalAmount)}</span>,
    },
    {
      key: "returnDate",
      header: "Date",
      render: (r: ReturnDoc) => <span className="text-slate-500">{formatDate(r.returnDate)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r: ReturnDoc) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
          r.status === "COMPLETED" ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20" :
          r.status === "PENDING" ? "bg-amber-50 text-amber-700 ring-amber-600/20" :
          "bg-red-50 text-red-700 ring-red-600/20"
        }`}>
          {r.status}
        </span>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Returns" description={`Process returns for ${channel}. Add a return from the list of sales or search by invoice/customer.`}>
        <Button onClick={openAddReturn} disabled={loadingAllSales}>
          <RotateCcw size={16} className="mr-1.5" />
          {loadingAllSales ? "Loading…" : "Add Return"}
        </Button>
      </PageHeader>

      <div className="px-6 pb-6 space-y-6">
        {/* Step 1: Search or Add Return */}
        {step === "search" && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Find a sale to return</h3>
            <p className="mb-3 text-xs text-slate-500">Search by invoice or customer name, or use <strong>Add Return</strong> above to see all sales and pick one.</p>
            <div className="flex gap-2">
              <Input
                placeholder="Invoice number or customer name"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchSales()}
                className="max-w-md"
              />
              <Button onClick={searchSales} disabled={searching || !invoiceSearch.trim()}>
                <Search size={16} className="mr-1.5" />
                {searching ? "Searching…" : "Search"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select a sale */}
        {step === "select" && (
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => { setStep("search"); setSales([]); setShowAllSales(false); }}>
                  <ArrowLeft size={15} className="mr-1" /> Back
                </Button>
                <span className="text-sm text-slate-500">
                  {showAllSales ? `All sales (${sales.length}) — pick one to mark return` : `${sales.length} result${sales.length !== 1 ? "s" : ""} found`}
                </span>
              </div>
            </div>
            {sales.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No matching sales found.</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {sales.map((s) => (
                  <li key={s._id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-5 py-3.5 text-left transition hover:bg-slate-50"
                      onClick={() => selectSale(s)}
                    >
                      <div>
                        <span className="font-medium text-slate-900">{s.invoiceNumber}</span>
                        {s.customerName && <span className="ml-2 text-sm text-slate-500">— {s.customerName}</span>}
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatDate(s.saleDate)} · {formatCurrency(s.grandTotal)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Step 3: Confirm return */}
        {step === "confirm" && selectedSale && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setStep("select")}>
                <ArrowLeft size={15} className="mr-1" /> Back
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-1 text-sm font-semibold text-slate-900">Sale: {selectedSale.invoiceNumber}</div>
              <p className="text-sm text-slate-500">
                {formatDate(selectedSale.saleDate)} · Customer: {selectedSale.customerName || "Walk-in"}
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Items to return</Label>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Product</th>
                    <th className="w-28 px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Return Qty</th>
                    <th className="w-32 px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {returnItems.map((r, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3 text-slate-700">
                        {r.item.productName}
                        {r.item.imei && <span className="ml-1 text-xs text-slate-400">({r.item.imei})</span>}
                      </td>
                      <td className="px-5 py-3">
                        <Input
                          type="number"
                          min={0}
                          max={r.item.quantity}
                          value={r.qty}
                          onChange={(e) => updateReturnQty(i, Number(e.target.value))}
                        />
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-900">{formatCurrency(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50/40">
                    <td colSpan={2} className="px-5 py-3 text-right text-sm font-semibold text-slate-700">Refund Total</td>
                    <td className="px-5 py-3 text-right text-base font-bold text-slate-900">{formatCurrency(returnTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Reason</Label>
                <Input className="mt-1.5" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Optional reason" />
              </div>
              <div>
                <Label>Refund Method</Label>
                <Input className="mt-1.5" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)} placeholder="e.g. Cash, Card" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={submitReturn} disabled={submitting}>
                <RotateCcw size={16} className="mr-1.5" />
                {submitting ? "Processing…" : "Process Return"}
              </Button>
              <Button variant="outline" onClick={() => setStep("select")}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Recent returns table */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent Returns</h2>
          <DataTable columns={returnColumns} data={returns ?? []} emptyMessage="No returns yet." />
        </div>
      </div>
    </div>
  );
}
