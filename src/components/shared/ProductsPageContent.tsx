"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import useSWR, { mutate } from "swr";
import { Plus, Pencil, Trash2, Barcode, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { PageSkeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import type { Channel } from "@/lib/constants";
import { BarcodeLabel } from "@/components/barcode/BarcodeLabel";

type Product = {
  _id: string;
  name: string;
  nameAr?: string;
  brand?: string;
  model?: string;
  category?: string;
  categoryId?: string;
  dealerId?: string | { _id: string; name: string; phone?: string };
  costPrice: number;
  sellPrice: number;
  minSellPrice?: number;
  quantity: number;
  channel: string;
  requiresImei?: boolean;
  imeiCount?: number;
  trackByBatch?: boolean;
  barcode?: string;
};

type ProductCategory = { _id: string; name: string; nameAr?: string; sortOrder: number };
type Dealer = { _id: string; name: string; phone?: string };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const emptyForm = {
  name: "",
  nameAr: "",
  brand: "",
  model: "",
  category: "",
  categoryId: "",
  dealerId: "",
  costPrice: "",
  sellPrice: "",
  minSellPrice: "",
  requiresImei: false,
  barcode: "",
};

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

export function ProductsPageContent({ channel }: { channel: Channel }) {
  const t = useTranslations("pages");
  const tForms = useTranslations("forms");
  const tTables = useTranslations("tables");
  const tModals = useTranslations("modals");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const swrKey = `/api/products?channel=${channel}`;
  const { data: products, isLoading } = useSWR<Product[]>(swrKey, fetcher);
  const { data: categories } = useSWR<ProductCategory[]>("/api/product-categories", fetcher);
  const { data: dealers } = useSWR<Dealer[]>("/api/dealers", fetcher);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [printBarcodeProduct, setPrintBarcodeProduct] = useState<Product | null>(null);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    const dealerId = typeof p.dealerId === "object" && p.dealerId ? p.dealerId._id : p.dealerId;
    setForm({
      name: p.name,
      nameAr: p.nameAr ?? "",
      brand: p.brand ?? "",
      model: p.model ?? "",
      category: p.category ?? "",
      categoryId: p.categoryId ?? "",
      dealerId: dealerId ?? "",
      costPrice: String(p.costPrice),
      sellPrice: String(p.sellPrice),
      minSellPrice: p.minSellPrice != null && p.minSellPrice > 0 ? String(p.minSellPrice) : "",
      requiresImei: Boolean(p.requiresImei),
      barcode: p.barcode ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/products/${editing._id}` : "/api/products";
      const method = editing ? "PUT" : "POST";
      const sellPriceNum = Number(form.sellPrice);
      const minSellPriceVal = form.minSellPrice === "" ? null : Number(form.minSellPrice);
      if (minSellPriceVal != null && minSellPriceVal > sellPriceNum) {
        alert(tErrors("minSellExceedsSell"));
        setSaving(false);
        return;
      }
      const payload = {
        ...form,
        ...(editing ? {} : { channel }),
        categoryId: form.categoryId || undefined,
        dealerId: form.dealerId || undefined,
        costPrice: Number(form.costPrice),
        sellPrice: sellPriceNum,
        minSellPrice: minSellPriceVal,
        requiresImei: Boolean(form.requiresImei),
        trackByBatch: true,
        barcode: form.barcode?.trim() || undefined,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setModalOpen(false);
        mutate(swrKey);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || tErrors("errorSavingProduct"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(tErrors("deleteProductConfirm"))) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) mutate(swrKey);
  }

  async function handleGenerateBarcode() {
    if (!editing) return;
    if (editing.requiresImei) return;
    setGeneratingBarcode(true);
    try {
      const res = await fetch(`/api/products/${editing._id}/generate-barcode`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.barcode) {
        setForm((f) => ({ ...f, barcode: data.barcode }));
        mutate(swrKey);
      } else {
        alert(data.error || tErrors("errorSavingProduct"));
      }
    } finally {
      setGeneratingBarcode(false);
    }
  }

  if (isLoading) return <PageSkeleton />;

  const columns = [
    { key: "name", header: tForms("name") },
    {
      key: "brand",
      header: tTables("brand"),
      render: (p: Product) => <span className="text-slate-500">{p.brand || "—"}</span>,
    },
    {
      key: "dealer",
      header: tTables("dealer"),
      render: (p: Product) => (
        <span className="text-slate-500">
          {typeof p.dealerId === "object" && p.dealerId ? p.dealerId.name : "—"}
        </span>
      ),
    },
    {
      key: "costPrice",
      header: tTables("cost"),
      render: (p: Product) => formatCurrency(p.costPrice),
    },
    {
      key: "sellPrice",
      header: tForms("sellPrice"),
      render: (p: Product) => <span className="font-medium">{formatCurrency(p.sellPrice)}</span>,
    },
    {
      key: "quantity",
      header: tTables("qty"),
      render: (p: Product) => (
        <span className="flex items-center gap-1.5">
          {p.requiresImei === true && p.imeiCount !== undefined ? (
            <>
              <QtyBadge qty={p.imeiCount} />
              <span className="text-[10px] text-slate-400">IMEI</span>
            </>
          ) : (
            <QtyBadge qty={p.quantity} />
          )}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      className: "w-48",
      render: (p: Product) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title={tModals("editProduct")}>
            <Pencil size={15} />
          </Button>
          {(p.barcode || (!p.requiresImei && p._id)) ? (
            <Button
              variant="ghost"
              size="icon"
              title={t("printBarcode")}
              onClick={() => setPrintBarcodeProduct(p)}
            >
              <Printer size={15} />
            </Button>
          ) : null}
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(p._id)} title={tCommon("delete")}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("products")} description={t("productsDescription", { channel })}>
        <Button onClick={openAdd}>
          <Plus size={16} className="mr-1.5" />
          {t("addProduct")}
        </Button>
      </PageHeader>

      <div className="px-6 pb-6">
        <DataTable columns={columns} data={products ?? []} emptyMessage={t("emptyProductsYet")} />
      </div>

      {/* Add / Edit Product Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? tModals("editProduct") : tModals("addProduct")}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pr-name">{tForms("name")} *</Label>
              <Input id="pr-name" className="mt-1.5" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="pr-nameAr">{t("nameArabic")}</Label>
              <Input id="pr-nameAr" className="mt-1.5" value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="pr-brand">{tTables("brand")}</Label>
              <Input id="pr-brand" className="mt-1.5" value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="pr-model">{t("model")}</Label>
              <Input id="pr-model" className="mt-1.5" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="pr-category">{tTables("category")}</Label>
              <select
                id="pr-category"
                className="mt-1.5 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">{t("noneOption")}</option>
                {(categories ?? []).map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="pr-dealer">{tTables("dealer")}</Label>
              <select
                id="pr-dealer"
                className="mt-1.5 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={form.dealerId}
                onChange={(e) => setForm((f) => ({ ...f, dealerId: e.target.value }))}
              >
                <option value="">{t("noneOption")}</option>
                {(dealers ?? []).map((d) => (
                  <option key={d._id} value={d._id}>{d.name}{d.phone ? ` — ${d.phone}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="pr-cost">{tForms("costPrice")} *</Label>
              <Input id="pr-cost" className="mt-1.5" type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="pr-sell">{tForms("sellPrice")} *</Label>
              <Input id="pr-sell" className="mt-1.5" type="number" step="0.01" min="0" value={form.sellPrice} onChange={(e) => setForm((f) => ({ ...f, sellPrice: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="pr-minSell">{tForms("minSellPrice")}</Label>
              <Input id="pr-minSell" className="mt-1.5" type="number" step="0.01" min="0" value={form.minSellPrice} onChange={(e) => setForm((f) => ({ ...f, minSellPrice: e.target.value }))} placeholder={t("optional")} />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="pr-requiresImei"
                checked={form.requiresImei}
                onChange={(e) => setForm((f) => ({ ...f, requiresImei: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <Label htmlFor="pr-requiresImei" className="font-normal">{t("requireImei")}</Label>
            </div>
            {form.requiresImei ? (
              <div className="sm:col-span-2 text-sm text-slate-500">
                {t("imeiIsBarcode")}
              </div>
            ) : (
              <>
                <div className="sm:col-span-2 flex flex-col gap-1.5">
                  <Label htmlFor="pr-barcode">{t("barcode")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="pr-barcode"
                      className="flex-1"
                      value={form.barcode}
                      onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                      placeholder={t("optional")}
                    />
                    {editing && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateBarcode}
                        disabled={generatingBarcode}
                      >
                        <Barcode size={14} className="mr-1" />
                        {generatingBarcode ? tCommon("saving") : t("generateBarcode")}
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>{tCommon("cancel")}</Button>
            <Button type="submit" disabled={saving}>{saving ? tCommon("saving") : tCommon("save")}</Button>
          </div>
        </form>
      </Modal>

      {/* Print barcode modal */}
      <Modal open={!!printBarcodeProduct} onClose={() => setPrintBarcodeProduct(null)} title={t("printBarcode")}>
        {printBarcodeProduct && (
          <div className="flex flex-col items-center gap-4 py-4">
            <BarcodeLabel
              barcode={printBarcodeProduct.barcode || `BC-${printBarcodeProduct._id}`}
              productName={printBarcodeProduct.name}
              price={printBarcodeProduct.sellPrice}
              trigger={(onClick) => (
                <Button onClick={onClick}>
                  <Printer size={16} className="mr-2" />
                  {t("printBarcode")}
                </Button>
              )}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
