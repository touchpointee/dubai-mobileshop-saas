"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import useSWR, { mutate } from "swr";
import { useReactToPrint } from "react-to-print";
import { Plus, FileText, Barcode, Layers, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { PageSkeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Channel } from "@/lib/constants";

type Dealer = { _id: string; name: string; phone?: string };
type Product = {
  _id: string;
  name: string;
  costPrice: number;
  requiresImei?: boolean;
};

type PurchaseItem = {
  productName: string;
  quantity: number;
  costPrice: number;
  totalPrice: number;
  imeis?: string[];
};

type Purchase = {
  _id: string;
  invoiceNumber: string;
  dealerId: { _id: string; name: string };
  items: PurchaseItem[];
  grandTotal: number;
  purchaseDate: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ItemRow = {
  productId: string;
  quantity: string;
  costPrice: string;
  imeiList: string[];
};

const emptyItemRow: ItemRow = { productId: "", quantity: "1", costPrice: "", imeiList: [] };

export function PurchasesPageContent({ channel }: { channel: Channel }) {
  const t = useTranslations("pages");
  const tForms = useTranslations("forms");
  const tTables = useTranslations("tables");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");

  const purchasesKey = `/api/purchases?channel=${channel}`;
  const productsKey = `/api/products?channel=${channel}`;
  const dealersKey = "/api/dealers";

  const { data: purchases, isLoading: loadingPurchases } = useSWR<Purchase[]>(purchasesKey, fetcher);
  const { data: products } = useSWR<Product[]>(productsKey, fetcher);
  const { data: dealers } = useSWR<Dealer[]>(dealersKey, fetcher);

  const productsList = Array.isArray(products) ? products : [];

  const [formOpen, setFormOpen] = useState(false);
  const [dealerId, setDealerId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyItemRow }]);
  const [saving, setSaving] = useState(false);
  const [detailsPurchaseId, setDetailsPurchaseId] = useState<string | null>(null);
  const imeiInputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const purchasePrintRef = useRef<HTMLDivElement>(null);
  const { data: detailsPurchase } = useSWR<Purchase | null>(
    detailsPurchaseId ? `/api/purchases/${detailsPurchaseId}` : null,
    fetcher
  );
  const handlePrintPurchase = useReactToPrint({
    contentRef: purchasePrintRef,
    documentTitle: detailsPurchase ? `Purchase-${detailsPurchase.invoiceNumber}` : "Purchase",
  });

  function openForm() {
    setDealerId("");
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setItems([{ ...emptyItemRow }]);
    setFormOpen(true);
  }

  function addRow() {
    setItems((prev) => [...prev, { ...emptyItemRow }]);
  }

  function removeRow(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: keyof ItemRow, value: string | string[]) {
    setItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      if (field === "productId" && typeof value === "string") {
        const prod = productsList.find((p) => p._id === value);
        if (prod) next[i].costPrice = String(prod.costPrice);
        if (prod?.requiresImei) next[i].quantity = ""; else next[i].imeiList = [];
      }
      return next;
    });
  }

  function updateRowImeiList(i: number, list: string[]) {
    setItems((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], imeiList: list };
      return next;
    });
  }

  const grandTotal = items.reduce((sum, row) => {
    const prod = productsList.find((p) => p._id === row.productId);
    const price = Number(row.costPrice) || 0;
    const qty = prod?.requiresImei
      ? (row.imeiList ?? []).map((s) => s.trim()).filter(Boolean).length
      : Math.max(0, Number(row.quantity) || 0);
    return sum + qty * price;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dealerId?.trim()) {
      alert(tErrors("selectDealer") || "Select a dealer");
      return;
    }
    const purchaseItems: { productId: string; quantity: number; costPrice: number; imeis: string[] }[] = [];
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      if (!row.productId) continue;
      const prod = productsList.find((p) => p._id === row.productId);
      if (!prod) continue;
      const costPrice = Number(row.costPrice);
      if (costPrice < 0) continue;
      if (prod.requiresImei) {
        const imeiList = (row.imeiList ?? []).map((s) => s.trim()).filter(Boolean);
        if (imeiList.length === 0) {
          alert(`Add at least one IMEI for ${prod.name}.`);
          return;
        }
        purchaseItems.push({ productId: row.productId, quantity: imeiList.length, costPrice, imeis: imeiList });
      } else {
        const qty = Math.max(0, Number(row.quantity) || 0);
        if (qty < 1) {
          alert(`Enter quantity for ${prod.name}.`);
          return;
        }
        purchaseItems.push({ productId: row.productId, quantity: qty, costPrice, imeis: [] });
      }
    }
    if (purchaseItems.length === 0) {
      alert("Add at least one item.");
      return;
    }

    setSaving(true);
    try {
      const body: { dealerId: string; items: typeof purchaseItems; notes?: string; purchaseDate?: string } = {
        dealerId: dealerId.trim(),
        items: purchaseItems,
      };
      if (notes.trim()) body.notes = notes.trim();
      if (purchaseDate) body.purchaseDate = new Date(purchaseDate).toISOString();
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setFormOpen(false);
        mutate(purchasesKey);
        mutate(productsKey);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Error creating purchase");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loadingPurchases) return <PageSkeleton />;

  const columns = [
    { key: "invoiceNumber", header: "Invoice" },
    {
      key: "dealerId",
      header: "Dealer",
      render: (p: Purchase) => (typeof p.dealerId === "object" ? p.dealerId?.name : "—"),
    },
    {
      key: "grandTotal",
      header: "Total",
      render: (p: Purchase) => <span className="font-medium">{formatCurrency(p.grandTotal)}</span>,
    },
    {
      key: "purchaseDate",
      header: "Date",
      render: (p: Purchase) => <span className="text-slate-500">{formatDate(p.purchaseDate)}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-28",
      render: (p: Purchase) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setDetailsPurchaseId(p._id)} title="View items, IMEIs & batch">
            <FileText size={15} />
          </Button>
        </div>
      ),
    },
  ];

  const selectClass =
    "mt-1.5 flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

  return (
    <div className="animate-fade-in">
      <PageHeader title="Purchases" description={`Record batches from existing products. Purchase orders for ${channel}.`}>
        <Button onClick={openForm}>
          <Plus size={16} className="mr-1.5" />
          Add Purchase
        </Button>
      </PageHeader>

      <div className="px-6 pb-6">
        <DataTable columns={columns} data={purchases ?? []} emptyMessage="No purchases yet. Add products on the Product page, then record purchases here." />
      </div>

      {/* Purchase details: items, IMEIs, batch */}
      <Modal
        open={!!detailsPurchaseId}
        onClose={() => setDetailsPurchaseId(null)}
        title={detailsPurchase ? `Purchase — ${detailsPurchase.invoiceNumber}` : "Purchase details"}
        size="lg"
      >
        {detailsPurchase ? (
          <div className="space-y-4">
            <div ref={purchasePrintRef} className="purchase-print-content">
              <h2 className="text-lg font-semibold text-slate-900">Purchase — {detailsPurchase.invoiceNumber}</h2>
              <p className="text-sm text-slate-500 mt-1">
                Dealer: {typeof detailsPurchase.dealerId === "object" ? detailsPurchase.dealerId?.name : "—"} · Date: {formatDate(detailsPurchase.purchaseDate)} · Total: {formatCurrency(detailsPurchase.grandTotal)}
              </p>
            <div className="overflow-hidden rounded-xl border border-slate-200 mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">Product</th>
                    <th className="w-16 px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">Qty</th>
                    <th className="w-24 px-4 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">Cost</th>
                    <th className="w-24 px-4 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">Total</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">IMEIs / Batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(detailsPurchase.items ?? []).map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium text-slate-900">{item.productName}</td>
                      <td className="px-4 py-3 text-slate-600">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.costPrice)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(item.totalPrice)}</td>
                      <td className="px-4 py-3">
                        {item.imeis && item.imeis.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            <Barcode size={14} className="shrink-0 text-slate-400" />
                            <span className="text-xs text-slate-600">{item.imeis.length} IMEI(s)</span>
                            <details className="ml-1">
                              <summary className="cursor-pointer text-xs text-teal-600">View</summary>
                              <ul className="mt-1 max-h-32 overflow-y-auto rounded border border-slate-100 bg-slate-50/50 p-2 text-xs font-mono text-slate-700">
                                {item.imeis.map((imei, j) => (
                                  <li key={j}>{imei}</li>
                                ))}
                              </ul>
                            </details>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-500">
                            <Layers size={14} className="shrink-0" />
                            <span className="text-xs">Batch: {item.quantity} × {formatCurrency(item.costPrice)}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </div>
            <div className="flex justify-end gap-2 no-print">
              <Button variant="outline" size="sm" onClick={() => handlePrintPurchase()}>
                <Printer size={14} className="mr-1" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDetailsPurchaseId(null)}>Close</Button>
            </div>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-slate-500">Loading…</p>
        )}
      </Modal>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Purchase" size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>{tTables("dealer")} *</Label>
              <select
                className={selectClass}
                value={dealerId}
                onChange={(e) => setDealerId(e.target.value)}
                required
              >
                <option value="">{t("noneOption")}</option>
                {(dealers ?? []).map((d) => (
                  <option key={d._id} value={d._id}>{d.name}{d.phone ? ` — ${d.phone}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Purchase date</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="mt-1.5" />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus size={14} className="mr-1" /> Add row
              </Button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">Product</th>
                    <th className="w-20 px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">Count</th>
                    <th className="w-28 px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">Price</th>
                    <th className="min-w-[200px] px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">IMEIs</th>
                    <th className="w-12 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((row, i) => {
                    const prod = productsList.find((p) => p._id === row.productId);
                    const isImei = prod?.requiresImei;
                    const imeiCount = (row.imeiList ?? []).filter((s) => s.trim()).length;
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <select
                            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                            value={row.productId}
                            onChange={(e) => updateRow(i, "productId", e.target.value)}
                          >
                            <option value="">Select product</option>
                            {productsList.map((p) => (
                              <option key={p._id} value={p._id}>{p.name}{p.requiresImei ? " (IMEI)" : ""}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          {isImei ? (
                            <span className="text-slate-600 font-medium">{imeiCount}</span>
                          ) : (
                            <Input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={(e) => updateRow(i, "quantity", e.target.value)}
                              className="w-20"
                            />
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.costPrice}
                            onChange={(e) => updateRow(i, "costPrice", e.target.value)}
                            placeholder={prod ? String(prod.costPrice) : ""}
                            className="w-24"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {isImei ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateRowImeiList(i, [...(row.imeiList ?? []), ""])}
                                >
                                  + Add IMEI
                                </Button>
                                <span className="text-xs text-slate-500">Count: {imeiCount}</span>
                              </div>
                              <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1">
                                {(row.imeiList ?? []).map((val, j) => (
                                  <div key={j} className="flex items-center gap-0.5">
                                    <input
                                      ref={(el) => { if (!imeiInputRefs.current[i]) imeiInputRefs.current[i] = []; imeiInputRefs.current[i][j] = el; }}
                                      type="text"
                                      inputMode="numeric"
                                      className="w-28 rounded border border-slate-200 px-2 py-1 text-xs"
                                      value={val}
                                      onChange={(e) => {
                                        const next = [...(row.imeiList ?? [])];
                                        next[j] = e.target.value;
                                        updateRowImeiList(i, next);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          const nextInput = imeiInputRefs.current[i]?.[j + 1];
                                          if (nextInput) nextInput.focus();
                                          else updateRowImeiList(i, [...(row.imeiList ?? []), ""]);
                                        }
                                      }}
                                      placeholder={`#${j + 1}`}
                                    />
                                    {(row.imeiList?.length ?? 0) > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 text-red-500"
                                        onClick={() => updateRowImeiList(i, (row.imeiList ?? []).filter((_, idx) => idx !== j))}
                                      >
                                        ×
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {items.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeRow(i)}>×</Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-right text-sm font-medium text-slate-700">
              Grand Total: <span className="text-base text-slate-900">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{tCommon("cancel")}</Button>
            <Button type="submit" disabled={saving}>{saving ? tCommon("saving") : "Save Purchase"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
