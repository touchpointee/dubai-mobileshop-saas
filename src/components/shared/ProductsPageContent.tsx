"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import useSWR, { mutate } from "swr";
import { swrFetcher } from "@/lib/swr-fetcher";
import { Plus, Pencil, Trash2, Barcode, Printer, Filter, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { PageSkeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CategoryCascadeSelect } from "@/components/shared/CategoryCascadeSelect";
import { formatCurrency } from "@/lib/utils";
import type { Channel } from "@/lib/constants";
import { BarcodePrintConfig } from "@/components/barcode/BarcodePrintConfig";

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
  condition?: "NEW" | "USED";
  isMarginScheme?: boolean;
};

type ProductCategory = { _id: string; name: string; nameAr?: string; sortOrder: number; parentId?: string | null; parentName?: string | null };
type Dealer = { _id: string; name: string; phone?: string };

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
  startingStock: "",
  stockQty: "",
  condition: "NEW",
  isMarginScheme: false,
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
  const { data: products, isLoading } = useSWR<Product[]>(swrKey, swrFetcher);
  const { data: categories } = useSWR<ProductCategory[]>("/api/product-categories", swrFetcher);
  const { data: dealers } = useSWR<Dealer[]>("/api/dealers", swrFetcher);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [printBarcodeProduct, setPrintBarcodeProduct] = useState<Product | null>(null);
  const [showAddCategoryInline, setShowAddCategoryInline] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState("");
  const addCategoryParentIdRef = useRef<string | null>(null);
  const [addCategorySaving, setAddCategorySaving] = useState(false);
  const [addDealerModalOpen, setAddDealerModalOpen] = useState(false);
  const [addDealerName, setAddDealerName] = useState("");
  const [addDealerPhone, setAddDealerPhone] = useState("");
  const [addDealerSaving, setAddDealerSaving] = useState(false);
  const [startingStockImeis, setStartingStockImeis] = useState<string[]>([]);
  const [scanImeiValue, setScanImeiValue] = useState("");
  const scanImeiInputRef = useRef<HTMLInputElement>(null);
  const [nameSearch, setNameSearch] = useState("");
  const [barcodeSearch, setBarcodeSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dealerFilter, setDealerFilter] = useState("");

  useEffect(() => {
    if (modalOpen && !editing && form.requiresImei) {
      const t = setTimeout(() => scanImeiInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [modalOpen, editing, form.requiresImei]);

  function addImeiFromScan(value: string) {
    const val = value.trim();
    if (!val) return;
    setStartingStockImeis((prev) => [...prev, val]);
    setForm((f) => ({
      ...f,
      startingStock: String(
        Math.max(
          Math.max(0, Math.floor(Number(f.startingStock))),
          startingStockImeis.length + 1
        )
      ),
    }));
    setScanImeiValue("");
    scanImeiInputRef.current?.focus();
  }

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm });
    setStartingStockImeis([]);
    setScanImeiValue("");
    setShowAddCategoryInline(false);
    setNewCategoryName("");
    setNewCategoryParentId("");
    addCategoryParentIdRef.current = null;
    setAddDealerModalOpen(false);
    setAddDealerName("");
    setAddDealerPhone("");
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setShowAddCategoryInline(false);
    setNewCategoryName("");
    setNewCategoryParentId("");
    addCategoryParentIdRef.current = null;
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
      startingStock: "",
      stockQty: String(p.quantity ?? 0),
      condition: p.condition ?? "NEW",
      isMarginScheme: Boolean(p.isMarginScheme),
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
      const startingStockVal =
        !editing && form.startingStock !== "" && !form.requiresImei
          ? Math.max(0, Math.floor(Number(form.startingStock)))
          : undefined;
      if (!editing && form.requiresImei && form.startingStock !== "") {
        const imeiCount = Math.max(0, Math.floor(Number(form.startingStock)));
        const filled = startingStockImeis.slice(0, imeiCount).filter((s) => s.trim() !== "");
        if (filled.length < imeiCount) {
          alert(t("startingStockImeisRequired") || "Enter all IMEI numbers for starting stock.");
          setSaving(false);
          return;
        }
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
        ...(startingStockVal !== undefined ? { startingStock: startingStockVal } : {}),
        ...(editing && !form.requiresImei && form.stockQty !== ""
          ? { quantity: Math.max(0, Math.floor(Number(form.stockQty))) }
          : {}),
        condition: form.condition,
        isMarginScheme: Boolean(form.isMarginScheme),
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const productId = data._id;
        if (!editing && form.requiresImei && productId && startingStockImeis.length > 0) {
          const imeisToAdd = startingStockImeis
            .slice(0, Math.max(0, Math.floor(Number(form.startingStock))))
            .map((s) => s.trim())
            .filter(Boolean);
          for (const imei of imeisToAdd) {
            const imeiRes = await fetch(`/api/products/${productId}/imeis`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imei }),
            });
            if (!imeiRes.ok) {
              const errData = await imeiRes.json().catch(() => ({}));
              alert(errData.error || tErrors("errorSavingProduct"));
              mutate(swrKey);
              setSaving(false);
              return;
            }
          }
        }
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

  async function handleAddCategoryInline(e?: React.FormEvent) {
    e?.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    const parentIdToSend = addCategoryParentIdRef.current ?? (newCategoryParentId || form.categoryId || undefined);
    setAddCategorySaving(true);
    try {
      const res = await fetch("/api/product-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          parentId: parentIdToSend,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data._id) {
        mutate("/api/product-categories");
        setForm((f) => ({ ...f, categoryId: data._id }));
        setNewCategoryName("");
        setNewCategoryParentId("");
        addCategoryParentIdRef.current = null;
        setShowAddCategoryInline(false);
      } else {
        alert(data.error || tErrors("errorAddingCategory"));
      }
    } finally {
      setAddCategorySaving(false);
    }
  }

  const dealerOptions = [
    { value: "", label: t("noneOption") },
    ...(dealers ?? []).map((d) => ({
      value: d._id,
      label: d.phone ? `${d.name} — ${d.phone}` : d.name,
    })),
  ];

  async function handleAddDealerSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = addDealerName.trim();
    if (!name) {
      alert(tErrors("errorSavingDealer") || "Name is required");
      return;
    }
    setAddDealerSaving(true);
    try {
      const res = await fetch("/api/dealers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: addDealerPhone.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data._id) {
        mutate("/api/dealers");
        setForm((f) => ({ ...f, dealerId: data._id }));
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

  const activeFilterCount = [categoryFilter, dealerFilter].filter(Boolean).length;
  const filteredProducts = (products ?? []).filter((p) => {
    const normalizedNameSearch = nameSearch.trim().toLowerCase();
    const normalizedBarcodeSearch = barcodeSearch.trim().toLowerCase();
    const dealerId = typeof p.dealerId === "object" && p.dealerId ? p.dealerId._id : p.dealerId;

    const matchesName =
      normalizedNameSearch.length === 0 ||
      p.name.toLowerCase().includes(normalizedNameSearch) ||
      (p.nameAr ?? "").toLowerCase().includes(normalizedNameSearch) ||
      (p.brand ?? "").toLowerCase().includes(normalizedNameSearch) ||
      (p.model ?? "").toLowerCase().includes(normalizedNameSearch);
    const matchesBarcode =
      normalizedBarcodeSearch.length === 0 ||
      (p.barcode ?? "").toLowerCase().includes(normalizedBarcodeSearch);
    const matchesCategory = !categoryFilter || p.categoryId === categoryFilter;
    const matchesDealer = !dealerFilter || dealerId === dealerFilter;

    return matchesName && matchesBarcode && matchesCategory && matchesDealer;
  });

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
          {p.requiresImei === true ? (
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
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Input
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              placeholder={t("searchByName")}
            />
            <Input
              value={barcodeSearch}
              onChange={(e) => setBarcodeSearch(e.target.value)}
              placeholder={t("searchByBarcode")}
            />
            <Button
              type="button"
              variant={showFilters || activeFilterCount > 0 ? "secondary" : "outline"}
              className="w-full lg:w-auto"
              onClick={() => setShowFilters((prev) => !prev)}
            >
              <Filter size={16} className="mr-1.5" />
              {t("filters")}
              {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">{t("allCategories")}</option>
                {(categories ?? []).map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-3">
                <select
                  value={dealerFilter}
                  onChange={(e) => setDealerFilter(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="">{t("allDealers")}</option>
                  {(dealers ?? []).map((dealer) => (
                    <option key={dealer._id} value={dealer._id}>
                      {dealer.name}
                    </option>
                  ))}
                </select>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setCategoryFilter("");
                    setDealerFilter("");
                  }}
                  disabled={activeFilterCount === 0}
                >
                  <X size={16} className="mr-1.5" />
                  {t("clearFilters")}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DataTable columns={columns} data={filteredProducts} emptyMessage={t("emptyProductsYet")} />
      </div>

      {/* Add dealer modal (from product form) - higher z-index so it appears above product modal */}
      <Modal open={addDealerModalOpen} onClose={() => setAddDealerModalOpen(false)} title={tModals("addDealer")} zIndex={100}>
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
              <Label htmlFor="pr-category">{tTables("category")}</Label>
              <CategoryCascadeSelect
                categories={categories ?? []}
                value={form.categoryId}
                onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
                placeholder={t("noneOption")}
                noneLabel={t("noneOption")}
                nextLevelLabel={t("subcategory")}
                addButtonLabel={t("addCategory")}
                onAddCategory={() => {
                  addCategoryParentIdRef.current = form.categoryId || null;
                  setNewCategoryParentId(form.categoryId || "");
                  setShowAddCategoryInline(true);
                }}
              />
              {showAddCategoryInline && (
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-slate-500">
                    {form.categoryId
                      ? `${t("parentCategory")}: ${(categories ?? []).find((c) => c._id === form.categoryId)?.name ?? form.categoryId}`
                      : t("parentCategory") + ": " + t("noneOption")}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCategoryInline();
                        }
                      }}
                      placeholder={t("newCategory")}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={addCategorySaving || !newCategoryName.trim()}
                      onClick={() => handleAddCategoryInline()}
                    >
                      {addCategorySaving ? tCommon("saving") : tCommon("add")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { addCategoryParentIdRef.current = null; setShowAddCategoryInline(false); setNewCategoryName(""); setNewCategoryParentId(""); }}
                    >
                      {tCommon("cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="pr-dealer">{tTables("dealer")}</Label>
              <div className="mt-1.5">
                <SearchableSelect
                  options={dealerOptions}
                  value={form.dealerId}
                  onChange={(v) => setForm((f) => ({ ...f, dealerId: v }))}
                  placeholder={t("selectDealer")}
                  addButtonLabel={t("addDealer")}
                  onAdd={() => setAddDealerModalOpen(true)}
                />
              </div>
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
            {editing && !form.requiresImei && (
              <div>
                <Label htmlFor="pr-stockQty">Stock Quantity</Label>
                <Input
                  id="pr-stockQty"
                  className="mt-1.5"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stockQty}
                  onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value }))}
                />
              </div>
            )}
            {!editing && (
              <div>
                <Label htmlFor="pr-startingStock">{t("startingStock")}</Label>
                <Input
                  id="pr-startingStock"
                  className="mt-1.5"
                  type="number"
                  min="0"
                  step="1"
                  value={form.startingStock}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((f) => ({ ...f, startingStock: val }));
                    const n = Math.max(0, Math.floor(Number(val)));
                    setStartingStockImeis((prev) => {
                      const next = prev.slice(0, n);
                      while (next.length < n) next.push("");
                      return next;
                    });
                  }}
                  placeholder={t("optional")}
                />
              </div>
            )}
            {!editing && form.requiresImei && (() => {
              const n = Math.max(
                Math.max(0, Math.floor(Number(form.startingStock))),
                startingStockImeis.length
              );
              return (
                <div className="sm:col-span-2 space-y-2">
                  <Label>{t("enterImeisForStartingStock")}</Label>
                  <div className="rounded-md border border-slate-200 bg-slate-50/50 p-2">
                    <Label htmlFor="pr-scan-imei" className="text-xs font-medium text-slate-500">
                      {t("scanImeiToAdd")}
                    </Label>
                    <Input
                      ref={scanImeiInputRef}
                      id="pr-scan-imei"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={scanImeiValue}
                      onChange={(e) => setScanImeiValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addImeiFromScan(scanImeiValue || (e.target as HTMLInputElement).value);
                        }
                      }}
                      placeholder={t("scanImeiPlaceholder")}
                      className="mt-1 font-mono text-sm"
                    />
                  </div>
                  {n > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {Array.from({ length: n }, (_, i) => (
                        <Input
                          key={i}
                          value={startingStockImeis[i] ?? ""}
                          onChange={(e) =>
                            setStartingStockImeis((prev) => {
                              const next = [...prev];
                              while (next.length < n) next.push("");
                              next[i] = e.target.value;
                              return next;
                            })
                          }
                          placeholder={`IMEI ${i + 1}`}
                          className="font-mono text-sm"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })()}
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
            <div className="sm:col-span-2 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="pr-condition">Condition:</Label>
                <select
                  id="pr-condition"
                  value={form.condition}
                  onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as "NEW" | "USED" }))}
                  className="rounded-md border border-slate-300 text-sm p-1"
                >
                  <option value="NEW">New</option>
                  <option value="USED">Used / Second-hand</option>
                </select>
              </div>
              {form.condition === "USED" && (
                <div className="flex items-center gap-2 ml-4">
                  <input
                    type="checkbox"
                    id="pr-isMarginScheme"
                    checked={form.isMarginScheme}
                    onChange={(e) => setForm((f) => ({ ...f, isMarginScheme: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <Label htmlFor="pr-isMarginScheme" className="font-normal text-amber-700">Apply Profit Margin Scheme (VAT)</Label>
                </div>
              )}
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

      <BarcodePrintConfig
        product={printBarcodeProduct}
        open={!!printBarcodeProduct}
        onClose={() => setPrintBarcodeProduct(null)}
      />
    </div>
  );
}
