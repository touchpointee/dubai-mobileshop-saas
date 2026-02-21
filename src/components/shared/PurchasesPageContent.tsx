"use client";

import { useState, useRef, useEffect } from "react";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Channel } from "@/lib/constants";

type Dealer = { _id: string; name: string; phone?: string };
type ProductCategory = { _id: string; name: string };
type Product = {
  _id: string;
  name: string;
  costPrice: number;
  requiresImei?: boolean;
  id?: string;
  barcode?: string;
};

type PurchaseItem = {
  productName: string;
  quantity: number;
  costPrice: number;
  totalPrice: number;
  imeis?: string[];
  discount?: number;
  itemCode?: string;
  subLoc?: string;
  uom?: string;
};

type Purchase = {
  _id: string;
  invoiceNumber: string;
  dealerId: { _id: string; name: string };
  items: PurchaseItem[];
  grandTotal: number;
  purchaseDate: string;
  applyVat?: boolean;
  vatRate?: number;
  vatAmount?: number;
  totalAmount?: number;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ItemRow = {
  productId: string;
  quantity: string;
  costPrice: string;
  imeiList: string[];
  discount: string;
  applyVat: boolean;
};

const emptyItemRow: ItemRow = { productId: "", quantity: "1", costPrice: "", imeiList: [], discount: "0", applyVat: false };

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
  const { data: categories } = useSWR<ProductCategory[]>("/api/product-categories", fetcher);
  const { data: shop } = useSWR<{ vatRate?: number }>("/api/shop", fetcher);

  const productsList = Array.isArray(products) ? products : [];
  const vatRate = typeof shop?.vatRate === "number" ? shop.vatRate : 5;

  const [formOpen, setFormOpen] = useState(false);
  const [dealerId, setDealerId] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([{ ...emptyItemRow }]);
  const [saving, setSaving] = useState(false);
  const [detailsPurchaseId, setDetailsPurchaseId] = useState<string | null>(null);
  const [addDealerModalOpen, setAddDealerModalOpen] = useState(false);
  const [addDealerName, setAddDealerName] = useState("");
  const [addDealerPhone, setAddDealerPhone] = useState("");
  const [addDealerSaving, setAddDealerSaving] = useState(false);
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [addProductForRowIndex, setAddProductForRowIndex] = useState<number | null>(null);
  const [addProductForm, setAddProductForm] = useState({ name: "", categoryId: "", dealerId: "", costPrice: "", sellPrice: "", requiresImei: false });
  const [addProductSaving, setAddProductSaving] = useState(false);
  const [scanTargetRowIndex, setScanTargetRowIndex] = useState<number | null>(null);
  const [scanInputValue, setScanInputValue] = useState("");
  const imeiInputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const purchasePrintRef = useRef<HTMLDivElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanValueRef = useRef("");
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
    setScanTargetRowIndex(null);
    setScanInputValue("");
    setFormOpen(true);
  }

  const hasAnyImeiRow = items.some((row) => {
    const p = productsList.find((x) => x._id === row.productId);
    return p?.requiresImei === true;
  });

  function commitScannedImei(valueToAdd: string) {
    const trimmed = valueToAdd.trim();
    if (!trimmed || scanTargetRowIndex === null) return;
    const row = items[scanTargetRowIndex];
    const existing = (row.imeiList ?? []).map((s) => s.trim()).filter(Boolean);
    if (existing.includes(trimmed)) return;
    updateRowImeiList(scanTargetRowIndex, [...existing, trimmed]);
    setScanInputValue("");
    scanValueRef.current = "";
    scanInputRef.current?.focus();
  }

  function handleScanInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setScanInputValue(v);
    scanValueRef.current = v;
    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = setTimeout(() => {
      scanTimeoutRef.current = null;
      const val = scanValueRef.current.trim();
      if (val.length >= 8 && scanTargetRowIndex !== null) commitScannedImei(val);
    }, 100);
  }

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, []);

  const dealerOptions = (dealers ?? []).map((d) => ({
    value: d._id,
    label: d.name + (d.phone ? ` — ${d.phone}` : ""),
  }));

  async function handleAddDealerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addDealerName.trim()) {
      alert(tErrors("errorSavingDealer") || "Name is required");
      return;
    }
    setAddDealerSaving(true);
    try {
      const res = await fetch("/api/dealers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addDealerName.trim(), phone: addDealerPhone.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data._id) {
        mutate(dealersKey);
        setDealerId(data._id);
        setAddDealerModalOpen(false);
        setAddDealerName("");
        setAddDealerPhone("");
      } else {
        alert(data.error || tErrors("errorSavingDealer"));
      }
    } finally {
      setAddDealerSaving(false);
    }
  }

  function openAddProductModal(rowIndex: number) {
    setAddProductForRowIndex(rowIndex);
    setAddProductForm((prev) => ({ name: "", categoryId: "", dealerId: dealerId || "", costPrice: "", sellPrice: "", requiresImei: false }));
    setAddProductModalOpen(true);
  }

  async function handleAddProductSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (addProductForRowIndex === null) return;
    const name = addProductForm.name.trim();
    const costPrice = Number(addProductForm.costPrice);
    const sellPrice = Number(addProductForm.sellPrice);
    if (!name) {
      alert(tErrors("errorSavingProduct") || "Name is required");
      return;
    }
    if (Number.isNaN(costPrice) || Number.isNaN(sellPrice)) {
      alert(tErrors("errorSavingProduct") || "Cost and sell price are required");
      return;
    }
    setAddProductSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          categoryId: addProductForm.categoryId || undefined,
          dealerId: addProductForm.dealerId || undefined,
          costPrice,
          sellPrice,
          requiresImei: addProductForm.requiresImei,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data._id) {
        mutate(productsKey);
        updateRow(addProductForRowIndex, "productId", data._id);
        const prod = data as { costPrice?: number };
        if (typeof prod.costPrice === "number") {
          updateRow(addProductForRowIndex, "costPrice", String(prod.costPrice));
        }
        setAddProductModalOpen(false);
        setAddProductForRowIndex(null);
        setAddProductForm({ name: "", categoryId: "", dealerId: "", costPrice: "", sellPrice: "", requiresImei: false });
      } else {
        alert(data.error || tErrors("errorSavingProduct"));
      }
    } finally {
      setAddProductSaving(false);
    }
  }

  function addRow() {
    setItems((prev) => [...prev, { ...emptyItemRow }]);
  }

  function removeRow(i: number) {
    setScanTargetRowIndex((prev) => {
      if (prev === null) return null;
      if (prev === i) return null;
      if (prev > i) return prev - 1;
      return prev;
    });
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: keyof ItemRow, value: string | string[] | boolean) {
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

  function getLineTotals() {
    return items.map((row) => {
      const prod = productsList.find((p) => p._id === row.productId);
      const price = Number(row.costPrice) || 0;
      const qty = prod?.requiresImei
        ? (row.imeiList ?? []).map((s) => s.trim()).filter(Boolean).length
        : Math.max(0, Number(row.quantity) || 0);
      const discount = Math.max(0, Number(row.discount) || 0);
      const lineTotalExVat = Math.max(0, qty * price - discount);
      const priceAftDisc = qty > 0 ? lineTotalExVat / qty : 0;
      // VAT added on top of product price when VAT is ticked
      const lineVatAmt = row.applyVat && vatRate > 0 ? lineTotalExVat * (vatRate / 100) : 0;
      const lineTotalIncl = lineTotalExVat + lineVatAmt;
      return { qty, price, discount, lineTotalExVat, lineTotalIncl, priceAftDisc, lineVatAmt };
    });
  }

  const lineTotals = getLineTotals();
  const grandTotal = lineTotals.reduce((sum, l) => sum + l.lineTotalIncl, 0);
  const totalVatAmt = lineTotals.reduce((sum, l) => sum + l.lineVatAmt, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dealerId?.trim()) {
      alert(tErrors("selectDealer") || "Select a dealer");
      return;
    }
    const purchaseItems: { productId: string; quantity: number; costPrice: number; imeis: string[]; discount?: number; applyVat?: boolean }[] = [];
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      if (!row.productId) continue;
      const prod = productsList.find((p) => p._id === row.productId);
      if (!prod) continue;
      const costPrice = Number(row.costPrice);
      if (costPrice < 0) continue;
      const discount = Math.max(0, Number(row.discount) || 0);
      if (prod.requiresImei) {
        const imeiList = (row.imeiList ?? []).map((s) => s.trim()).filter(Boolean);
        if (imeiList.length === 0) {
          alert(`Add at least one IMEI for ${prod.name}.`);
          return;
        }
        purchaseItems.push({ productId: row.productId, quantity: imeiList.length, costPrice, imeis: imeiList, discount, applyVat: row.applyVat });
      } else {
        const qty = Math.max(0, Number(row.quantity) || 0);
        if (qty < 1) {
          alert(`Enter quantity for ${prod.name}.`);
          return;
        }
        purchaseItems.push({ productId: row.productId, quantity: qty, costPrice, imeis: [], discount, applyVat: row.applyVat });
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
                {detailsPurchase.applyVat && typeof detailsPurchase.vatRate === "number" && (detailsPurchase.vatAmount ?? 0) > 0 && (
                  <> · VAT ({detailsPurchase.vatRate}%): {formatCurrency(detailsPurchase.vatAmount ?? 0)}</>
                )}
              </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 mt-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="w-10 px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">{t("itemCode")}</th>
                    <th className="min-w-[140px] px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">{t("description")}</th>
                    <th className="w-14 px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">{t("uom")}</th>
                    <th className="w-14 px-3 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">Qty</th>
                    <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">{t("priceIncVat")}</th>
                    <th className="w-20 px-3 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">{t("disc")}</th>
                    <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">{t("priceAftDisc")}</th>
                    <th className="w-14 px-3 py-2.5 text-center text-xs font-semibold uppercase text-slate-500">{t("vatPercent")}</th>
                    <th className="w-22 px-3 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">{t("vatAmt")}</th>
                    <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">{t("netAmount")}</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">IMEIs / Batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(detailsPurchase.items ?? []).map((item, i) => {
                    const discount = item.discount ?? 0;
                    const qty = item.quantity;
                    const priceAftDisc = qty > 0 ? item.totalPrice / qty : 0;
                    const itemWithVat = item as typeof item & { applyVat?: boolean; vatAmount?: number };
                    const vatRate = (detailsPurchase.applyVat && typeof detailsPurchase.vatRate === "number") ? detailsPurchase.vatRate : 0;
                    const lineVatAmt = typeof itemWithVat.vatAmount === "number" ? itemWithVat.vatAmount : (itemWithVat.applyVat && vatRate > 0 ? (item.totalPrice * vatRate) / (100 + vatRate) : 0);
                    const showVatRate = itemWithVat.applyVat && vatRate > 0 ? vatRate : "—";
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2.5 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{item.itemCode ?? "—"}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-900">{item.productName}</td>
                        <td className="px-3 py-2.5 text-slate-600">{item.uom ?? "PCS"}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{formatCurrency(item.costPrice)}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{formatCurrency(discount)}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{formatCurrency(priceAftDisc)}</td>
                        <td className="px-3 py-2.5 text-center text-slate-600">{showVatRate}</td>
                        <td className="px-3 py-2.5 text-right text-slate-600">{formatCurrency(lineVatAmt)}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-slate-900">{formatCurrency(item.totalPrice)}</td>
                        <td className="px-3 py-2.5">
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
                    );
                  })}
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={t("addPurchase")} size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>{tTables("dealer")} *</Label>
              <div className="mt-1.5">
                <SearchableSelect
                  options={dealerOptions}
                  value={dealerId}
                  onChange={setDealerId}
                  placeholder={t("selectDealer")}
                  required
                  addButtonLabel={t("addDealer")}
                  onAdd={() => setAddDealerModalOpen(true)}
                />
              </div>
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
          {hasAnyImeiRow && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
              <Barcode size={18} className="text-slate-500" />
              <Label htmlFor="purchase-scan-imei" className="font-normal text-slate-700">{t("scanImei")}</Label>
              <input
                id="purchase-scan-imei"
                ref={scanInputRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                aria-label={t("scanImei")}
                value={scanInputValue}
                onChange={handleScanInputChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (scanTimeoutRef.current) {
                      clearTimeout(scanTimeoutRef.current);
                      scanTimeoutRef.current = null;
                    }
                    commitScannedImei(scanInputValue);
                  }
                }}
                placeholder={scanTargetRowIndex === null ? t("scanForThisRowHint") : t("scanImeiPlaceholder")}
                className="min-w-[200px] rounded border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              />
              {scanTargetRowIndex !== null && (() => {
                const row = items[scanTargetRowIndex];
                const prod = productsList.find((p) => p._id === row?.productId);
                return (
                  <span className="text-xs text-slate-500">
                    {t("scansAddToThisRow")}: Row {scanTargetRowIndex + 1} — {prod?.name ?? "—"}
                  </span>
                );
              })()}
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                <Plus size={14} className="mr-1" /> Add row
              </Button>
            </div>
            <div className="overflow-visible rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="w-10 px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">#</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">{t("itemCode")}</th>
                    <th className="min-w-[160px] px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">{t("description")}</th>
                    <th className="w-16 px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">{t("uom")}</th>
                    <th className="w-20 px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">Qty</th>
                    <th className="w-28 px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">{t("priceIncVat")}</th>
                    <th className="w-24 px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">{t("disc")}</th>
                    <th className="w-28 px-3 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">{t("priceAftDisc")}</th>
                    <th className="w-12 px-3 py-2.5 text-center text-xs font-semibold uppercase text-slate-500" title={t("vat")}>{t("vat")}</th>
                    <th className="w-14 px-3 py-2.5 text-center text-xs font-semibold uppercase text-slate-500">{t("vatPercent")}</th>
                    <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">{t("vatAmt")}</th>
                    <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold uppercase text-slate-500">{t("netAmount")}</th>
                    <th className="min-w-[200px] px-3 py-2.5 text-left text-xs font-semibold uppercase text-slate-500">IMEIs</th>
                    <th className="w-12 px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((row, i) => {
                    const prod = productsList.find((p) => p._id === row.productId);
                    const isImei = prod?.requiresImei;
                    const imeiCount = (row.imeiList ?? []).filter((s) => s.trim()).length;
                    const lt = lineTotals[i];
                    const itemCode = prod ? (prod.id ?? prod.barcode ?? prod._id) : "—";
                    return (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">{row.productId ? itemCode : "—"}</td>
                        <td className="px-3 py-2">
                          <SearchableSelect
                            options={productsList.map((p) => ({
                              value: p._id,
                              label: p.name + (p.requiresImei ? " (IMEI)" : ""),
                            }))}
                            value={row.productId}
                            onChange={(v) => {
                              updateRow(i, "productId", v);
                              const p = productsList.find((x) => x._id === v);
                              if (p?.requiresImei) setScanTargetRowIndex(i);
                            }}
                            placeholder={t("selectProduct")}
                            addButtonLabel={t("addProduct")}
                            onAdd={() => openAddProductModal(i)}
                            className="min-w-[180px]"
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-600">PCS</td>
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
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.discount ?? "0"}
                            onChange={(e) => updateRow(i, "discount", e.target.value)}
                            className="w-20"
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">{lt ? formatCurrency(lt.priceAftDisc) : "—"}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={row.applyVat}
                            onChange={(e) => updateRow(i, "applyVat", e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            title={t("applyVat")}
                          />
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600">{row.applyVat ? vatRate : "—"}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{lt ? formatCurrency(lt.lineVatAmt) : "—"}</td>
                        <td className="px-3 py-2 text-right font-medium text-slate-900">{lt ? formatCurrency(lt.lineTotalIncl) : "—"}</td>
                        <td className="px-3 py-2">
                          {isImei ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setScanTargetRowIndex(i);
                                    setTimeout(() => scanInputRef.current?.focus(), 0);
                                  }}
                                  title={t("scanForThisRow")}
                                >
                                  <Barcode size={14} className="mr-1" />
                                  {t("scanForThisRow")}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateRowImeiList(i, [...(row.imeiList ?? []), ""])}
                                >
                                  + Add IMEI
                                </Button>
                                <span className="text-xs text-slate-500">Count: {imeiCount}</span>
                                {scanTargetRowIndex === i && (
                                  <span className="text-xs text-teal-600">{t("scansAddToThisRow")}</span>
                                )}
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
            <div className="mt-2 flex flex-col items-end gap-0.5 text-sm font-medium text-slate-700">
              {totalVatAmt > 0 && (
                <span>{t("vat")} ({vatRate}%): <span className="text-slate-900">{formatCurrency(totalVatAmt)}</span></span>
              )}
              <span>{t("grandTotal")}: <span className="text-base text-slate-900">{formatCurrency(grandTotal)}</span></span>
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{tCommon("cancel")}</Button>
            <Button type="submit" disabled={saving}>{saving ? tCommon("saving") : t("savePurchase")}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={addDealerModalOpen} onClose={() => setAddDealerModalOpen(false)} title={t("addDealer")}>
        <form onSubmit={handleAddDealerSubmit} className="space-y-4">
          <div>
            <Label htmlFor="add-dealer-name">{tForms("name")} *</Label>
            <Input
              id="add-dealer-name"
              className="mt-1.5"
              value={addDealerName}
              onChange={(e) => setAddDealerName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="add-dealer-phone">{tForms("phone")}</Label>
            <Input
              id="add-dealer-phone"
              className="mt-1.5"
              value={addDealerPhone}
              onChange={(e) => setAddDealerPhone(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setAddDealerModalOpen(false)}>{tCommon("cancel")}</Button>
            <Button type="submit" disabled={addDealerSaving}>{addDealerSaving ? tCommon("saving") : tCommon("save")}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={addProductModalOpen} onClose={() => { setAddProductModalOpen(false); setAddProductForRowIndex(null); }} title={t("addProduct")}>
        <form onSubmit={handleAddProductSubmit} className="space-y-4">
          <div>
            <Label htmlFor="add-product-name">{tForms("name")} *</Label>
            <Input
              id="add-product-name"
              className="mt-1.5"
              value={addProductForm.name}
              onChange={(e) => setAddProductForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="add-product-category">{tTables("category")}</Label>
            <select
              id="add-product-category"
              className="mt-1.5 flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              value={addProductForm.categoryId}
              onChange={(e) => setAddProductForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">{t("noneOption")}</option>
              {(categories ?? []).map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="add-product-dealer">{tTables("dealer")}</Label>
            <select
              id="add-product-dealer"
              className="mt-1.5 flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              value={addProductForm.dealerId}
              onChange={(e) => setAddProductForm((f) => ({ ...f, dealerId: e.target.value }))}
            >
              <option value="">{t("noneOption")}</option>
              {(dealers ?? []).map((d) => (
                <option key={d._id} value={d._id}>{d.name}{d.phone ? ` — ${d.phone}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="add-product-cost">{tForms("costPrice")} *</Label>
            <Input
              id="add-product-cost"
              type="number"
              step="0.01"
              min="0"
              className="mt-1.5"
              value={addProductForm.costPrice}
              onChange={(e) => setAddProductForm((f) => ({ ...f, costPrice: e.target.value }))}
              required
            />
          </div>
          <div>
            <Label htmlFor="add-product-sell">{tForms("sellPrice")} *</Label>
            <Input
              id="add-product-sell"
              type="number"
              step="0.01"
              min="0"
              className="mt-1.5"
              value={addProductForm.sellPrice}
              onChange={(e) => setAddProductForm((f) => ({ ...f, sellPrice: e.target.value }))}
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="add-product-imei"
              checked={addProductForm.requiresImei}
              onChange={(e) => setAddProductForm((f) => ({ ...f, requiresImei: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <Label htmlFor="add-product-imei" className="font-normal">{t("requireImei")}</Label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => { setAddProductModalOpen(false); setAddProductForRowIndex(null); }}>{tCommon("cancel")}</Button>
            <Button type="submit" disabled={addProductSaving}>{addProductSaving ? tCommon("saving") : tCommon("save")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
