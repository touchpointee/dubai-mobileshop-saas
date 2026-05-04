"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { usePosStore } from "@/stores/pos-store";
import { formatCurrency } from "@/lib/utils";
import type { Channel } from "@/lib/constants";
import { ThermalReceipt } from "@/components/receipts/ThermalReceipt";
import { printA4InvoicePdf } from "@/components/receipts/A4Invoice";
import type { ThermalPrintSettings } from "@/components/receipts/ThermalReceipt";
import { Search, ShoppingCart, User, Percent, Package, Check, Minus, Plus } from "lucide-react";

type Product = { _id: string; name: string; sellPrice: number; quantity: number; brand?: string; requiresImei?: boolean; imeiCount?: number; minSellPrice?: number };

function getAvailableQty(p: Product): number {
  return p.requiresImei ? (p.imeiCount ?? p.quantity ?? 0) : p.quantity;
}
type ProductImei = { _id: string; imei: string; status: string };
type Customer = { _id: string; name: string; phone?: string };
type PaymentMethod = { _id: string; name: string; type?: string; provider?: string; requiresReference?: boolean };
type Branch = { _id: string; name: string; code?: string; isDefault?: boolean; isActive?: boolean };

type LastSale = {
  invoiceNumber: string;
  saleDate: string;
  customerName?: string;
  customerPhone?: string;
  items: { productName: string; quantity: number; unitPrice: number; totalPrice: number; imei?: string }[];
  payments: { methodName: string; amount: number }[];
  subtotal: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  hasMarginSchemeItems?: boolean;
  channel: "VAT" | "NON_VAT";
  shop?: { name?: string; address?: string; phone?: string; trnNumber?: string; printSettings?: ThermalPrintSettings };
};

export function POSScreen({
  channel,
  vatRate,
  allowChannelSwitch,
  onChannelChange,
  includeChannelInSale,
}: {
  channel: Channel;
  vatRate: number;
  allowChannelSwitch?: boolean;
  onChannelChange?: (channel: Channel) => void;
  includeChannelInSale?: boolean;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [search, setSearch] = useState("");
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [customerModal, setCustomerModal] = useState(false);
  const [discountModal, setDiscountModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentModalPreSelectId, setPaymentModalPreSelectId] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<LastSale | null>(null);
  const [imeiModal, setImeiModal] = useState<{ product: Product; imeis: ProductImei[] } | null>(null);
  const [a4LanguageModalOpen, setA4LanguageModalOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const t = useTranslations("pages");
  const tForms = useTranslations("forms");
  const tModals = useTranslations("modals");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const {
    items, customerName, customerPhone, discountType, discountValue,
    addItem, removeItem, updateItemQty, updateItemTotal, setCustomer, setDiscount, clearCart, getGrandTotal,
  } = usePosStore();

  const totals = getGrandTotal(channel === "VAT" ? vatRate : 0);

  const fetchProducts = useCallback(() => {
    const params = new URLSearchParams({ channel });
    if (branchId) params.set("branchId", branchId);
    fetch(`/api/products?${params}`).then((r) => { if (r.ok) return r.json().then(setProducts); });
  }, [channel, branchId]);
  const fetchCustomers = useCallback(() => {
    fetch("/api/customers").then((r) => { if (r.ok) return r.json().then(setCustomers); });
  }, []);
  const fetchPaymentMethods = useCallback(() => {
    fetch("/api/payment-methods").then((r) => { if (r.ok) return r.json().then(setPaymentMethods); });
  }, []);
  const fetchBranches = useCallback(() => {
    fetch("/api/branches").then((r) => {
      if (r.ok) return r.json().then((data: Branch[]) => {
        const active = data.filter((b) => b.isActive !== false);
        setBranches(active);
        setBranchId((current) => current || active.find((b) => b.isDefault)?._id || active[0]?._id || "");
      });
    });
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchPaymentMethods();
    fetchBranches();
  }, [fetchProducts, fetchCustomers, fetchPaymentMethods, fetchBranches]);

  useEffect(() => {
    if (!search.trim()) { setFilteredProducts(products.filter((p) => getAvailableQty(p) > 0).slice(0, 30)); return; }
    const q = search.toLowerCase();
    setFilteredProducts(products.filter((p) => p.name.toLowerCase().includes(q) && getAvailableQty(p) > 0).slice(0, 30));
  }, [search, products]);

  function handleAddProduct(p: Product) {
    const inCartQty = items.filter((i) => i.productId === p._id).reduce((s, i) => s + i.quantity, 0);
    if (getAvailableQty(p) - inCartQty <= 0) return;
    // Add to cart immediately (frontend state) so UI feels instant
    addItem({ productId: p._id, productName: p.name, quantity: 1, unitPrice: p.sellPrice, discount: 0, totalPrice: p.sellPrice });
    // Then check IMEI: if product requires IMEI selection, undo add and open modal
    fetch(`/api/products/${p._id}/imeis${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((imeis: ProductImei[]) => {
        if (imeis.length > 0) {
          const state = usePosStore.getState();
          const idx = state.items.findIndex((i) => i.productId === p._id && !i.imeiId);
          if (idx >= 0) {
            const line = state.items[idx];
            if (line.quantity <= 1) usePosStore.getState().removeItem(idx);
            else usePosStore.getState().updateItemQty(idx, line.quantity - 1);
          }
          setImeiModal({ product: p, imeis });
        }
      })
      .catch(() => {});
  }

  function handleSelectImei(imei: ProductImei, product: Product) {
    const alreadyInCart = items.some((i) => i.imeiId === imei._id);
    if (alreadyInCart) {
      alert(tErrors("imeiAlreadyInCart"));
      return;
    }
    addItem({ productId: product._id, productName: product.name, quantity: 1, unitPrice: product.sellPrice, discount: 0, totalPrice: product.sellPrice, imeiId: imei._id, imei: imei.imei });
    setImeiModal(null);
    focusScannerInput();
  }

  async function handleBarcodeScan(code: string) {
    if (code.length < 3) return;
    const lookupParams = new URLSearchParams({ code, channel });
    if (branchId) lookupParams.set("branchId", branchId);
    const res = await fetch(`/api/products/lookup?${lookupParams}`);
    setBarcodeInput("");
    barcodeInputRef.current?.focus();
    if (!res.ok) {
      if (res.status === 404) {
        alert(tErrors("productNotFoundForScan"));
      }
      return;
    }
    const data = await res.json();
    const product = data.product as Product;
    const productId = String(product._id);
    if (data.type === "imei") {
      const alreadyInCart = items.some((i) => i.imeiId === data.imeiId);
      if (alreadyInCart) {
        alert(tErrors("imeiAlreadyInCart"));
        return;
      }
      addItem({
        productId,
        productName: product.name,
        quantity: 1,
        unitPrice: product.sellPrice,
        discount: 0,
        totalPrice: product.sellPrice,
        imeiId: data.imeiId,
        imei: data.imei,
      });
      return;
    }
    if (data.type === "barcode") {
      if (getAvailableQty(product) <= 0) return;
      addItem({ productId, productName: product.name, quantity: 1, unitPrice: product.sellPrice, discount: 0, totalPrice: product.sellPrice });
      if (product.requiresImei) {
        fetch(`/api/products/${productId}/imeis${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((imeis: ProductImei[]) => {
            if (imeis.length > 0) {
              const state = usePosStore.getState();
              const idx = state.items.findIndex((i) => i.productId === productId && !i.imeiId);
              if (idx >= 0) {
                const line = state.items[idx];
                if (line.quantity <= 1) usePosStore.getState().removeItem(idx);
                else usePosStore.getState().updateItemQty(idx, line.quantity - 1);
              }
              setImeiModal({ product: { ...product, _id: productId }, imeis });
            }
          })
          .catch(() => {});
      }
    }
  }

  async function submitPayment(paymentRows: { paymentMethodId: string; amount: number; reference?: string }[]) {
    const totalPaid = paymentRows.reduce((s, r) => s + r.amount, 0);
    if (totalPaid < totals.grandTotal) { alert(tErrors("paymentAmountLessThanTotal")); return; }
    const state = usePosStore.getState();
    const body: Record<string, unknown> = {
      customerId: state.customerId,
      customerName: state.customerName,
      customerPhone: state.customerPhone,
      items: state.items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount, imeiId: i.imeiId, imei: i.imei })),
      discountType: state.discountType,
      discountValue: state.discountValue,
      payments: paymentRows,
      branchId,
    };
    if (includeChannelInSale) body.channel = channel;
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const sale = (await res.json()) as LastSale;
      setLastSale(sale);
      clearCart();
      setPaymentModal(false);
      setPaymentModalPreSelectId(null);
      fetchProducts();
      focusScannerInput();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || tErrors("errorCreatingSale"));
    }
  }

  const focusScannerInput = useCallback(() => {
    requestAnimationFrame(() => {
      barcodeInputRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    focusScannerInput();
  }, [focusScannerInput]);

  return (
    <div className="flex h-screen">
      {/* Hidden input for barcode scanner - auto-focused on open and after modals close so scanner works immediately */}
      <input
        ref={barcodeInputRef}
        type="text"
        autoComplete="off"
        aria-label="Barcode scan"
        value={barcodeInput}
        onChange={(e) => setBarcodeInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleBarcodeScan(barcodeInput);
          }
        }}
        className="absolute opacity-0 w-0 h-0 pointer-events-none left-0 top-0"
        tabIndex={0}
      />
      {/* Products panel */}
      <div className="flex flex-1 flex-col border-e border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={tForms("searchProductsShort")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-10 h-12 text-base"
            />
          </div>
          {branches.length > 0 && (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-teal-500"
            >
              {branches.map((branch) => (
                <option key={branch._id} value={branch._id}>{branch.name}</option>
              ))}
            </select>
          )}
          <span className="text-sm font-medium text-slate-400">VAT {t("channel")}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((p) => {
              const inCartQty = items.filter((i) => i.productId === p._id).reduce((s, i) => s + i.quantity, 0);
              const availableQty = Math.max(0, getAvailableQty(p) - inCartQty);
              return (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => handleAddProduct(p)}
                  disabled={availableQty <= 0}
                  className="group block min-h-[88px] min-w-0 w-full overflow-hidden rounded-xl border border-slate-100 bg-white p-4 text-left transition hover:border-teal-200 hover:shadow-md active:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <div className="mb-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600">
                    <Package size={22} />
                  </div>
                  <p className="min-w-0 truncate text-base font-medium text-slate-900">{p.name}</p>
                  {p.brand && <p className="min-w-0 truncate text-sm text-slate-400">{p.brand}</p>}
                  <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-base font-bold text-teal-600">{formatCurrency(p.sellPrice)}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${availableQty <= 2 ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"}`}>
                      {p.requiresImei ? `${availableQty} IMEI` : `${availableQty} left`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Package size={40} className="mb-2" />
              <p className="text-sm">{t("noProductsFound")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="flex w-[400px] flex-col bg-slate-50/80">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-teal-600" />
            <span className="text-base font-semibold text-slate-900">{t("cart")} ({items.length})</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="touch" onClick={() => setCustomerModal(true)} className="min-h-[44px] px-4">
              <User size={18} className="me-2" />
              {customerName || tForms("customer")}
            </Button>
            <Button variant="outline" size="touch" onClick={() => setDiscountModal(true)} className="min-h-[44px] px-4">
              <Percent size={18} className="me-2" />
              {discountValue ? `${discountValue}${discountType === "PERCENTAGE" ? "%" : " AED"}` : t("discount")}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {items.map((item, i) => {
            const originalTotal = item.quantity * item.unitPrice;
            const offerAmount = originalTotal - item.totalPrice;
            return (
              <div key={i} className="mb-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-slate-900">{item.productName}</p>
                    <p className="text-sm text-slate-500">
                      {item.quantity} x {formatCurrency(item.unitPrice)}
                      {item.imei && <span className="ms-1 font-mono text-teal-600">{item.imei}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!item.imeiId ? (
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700" onClick={() => (item.quantity <= 1 ? removeItem(i) : updateItemQty(i, item.quantity - 1))}>
                        <Minus size={18} />
                      </Button>
                    ) : null}
                    {!item.imeiId ? (
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700" onClick={() => updateItemQty(i, item.quantity + 1)}>
                        <Plus size={18} />
                      </Button>
                    ) : null}
                    <Button variant="ghost" size="touch" onClick={() => removeItem(i)} className="min-h-[44px] min-w-[44px] p-0 text-red-500 hover:bg-red-50 hover:text-red-600 text-lg">
                      &times;
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                  <label className="text-xs text-slate-500">{t("enterPrice")}</label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-10 w-24 text-end text-base font-semibold"
                      value={item.totalPrice === 0 ? "" : item.totalPrice}
                      placeholder={formatCurrency(originalTotal)}
                      onChange={(e) => {
                        const v = e.target.value === "" ? 0 : parseFloat(e.target.value);
                        if (!Number.isNaN(v)) updateItemTotal(i, v);
                      }}
                    />
                    {offerAmount > 0 && (
                      <span className="text-sm font-medium text-green-600 whitespace-nowrap">
                        {formatCurrency(offerAmount)} {t("offer")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <ShoppingCart size={36} className="mb-2" />
              <p className="text-sm">{t("cartEmpty")}</p>
            </div>
          )}
        </div>
        <div className="border-t border-slate-200 bg-white p-5 space-y-2">
          <div className="flex justify-between text-base text-slate-600">
            <span>{t("subtotal")}</span><span>{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.discountAmount > 0 && (
            <div className="flex justify-between text-base text-green-600">
              <span>{t("discount")}</span><span>-{formatCurrency(totals.discountAmount)}</span>
            </div>
          )}
          {channel === "VAT" && totals.vatAmount > 0 && (
            <div className="flex justify-between text-base text-slate-600">
              <span>{t("vatLabel")} ({vatRate}%)</span><span>{formatCurrency(totals.vatAmount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 text-xl font-bold text-slate-900">
            <span>{t("total")}</span><span>{formatCurrency(totals.grandTotal)}</span>
          </div>
          {paymentMethods.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-slate-600">{t("paymentMethod")}</p>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((pm) => (
                  <Button
                    key={pm._id}
                    type="button"
                    variant="outline"
                    className="min-h-[56px] text-base font-semibold rounded-xl border-slate-200 hover:border-teal-300 hover:bg-teal-50"
                    onClick={() => {
                      if (items.length > 0) {
                        setPaymentModalPreSelectId(pm._id);
                        setPaymentModal(true);
                      }
                    }}
                    disabled={items.length === 0}
                  >
                    {pm.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customer modal */}
      <Modal open={customerModal} onClose={() => { setCustomerModal(false); focusScannerInput(); }} title={tModals("selectCustomer")} size="md">
        <div className="max-h-56 overflow-y-auto border border-slate-100 rounded-xl mb-4">
          <button type="button" className="w-full border-b border-slate-50 px-4 py-4 text-left text-base hover:bg-slate-50 rounded-t-xl" onClick={() => { setCustomer(null, "", ""); setCustomerModal(false); focusScannerInput(); }}>{t("walkInCustomer")}</button>
          {customers.map((c) => (
            <button key={c._id} type="button" className="w-full border-b border-slate-50 px-4 py-4 text-left text-base hover:bg-slate-50 last:border-0" onClick={() => { setCustomer(c._id, c.name, c.phone ?? ""); setCustomerModal(false); focusScannerInput(); }}>
              {c.name} {c.phone ? <span className="text-slate-400">— {c.phone}</span> : ""}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <div><Label className="text-sm">Name</Label><Input className="mt-1.5 h-11 text-base" value={customerName} onChange={(e) => setCustomer(usePosStore.getState().customerId, e.target.value, customerPhone)} placeholder="Customer name" /></div>
          <div><Label className="text-sm">Phone</Label><Input className="mt-1.5 h-11 text-base" value={customerPhone} onChange={(e) => setCustomer(usePosStore.getState().customerId, customerName, e.target.value)} placeholder="Phone" /></div>
        </div>
        <Button className="mt-4 w-full min-h-[48px] text-base" size="touch" onClick={() => { setCustomerModal(false); focusScannerInput(); }}>{tCommon("done")}</Button>
      </Modal>

      {/* Discount modal */}
      <Modal open={discountModal} onClose={() => { setDiscountModal(false); focusScannerInput(); }} title={tModals("discount")} size="md">
        <div className="flex gap-3 mb-4">
          <Button variant={discountType === "PERCENTAGE" ? "default" : "outline"} size="touch" className="flex-1 min-h-[48px]" onClick={() => setDiscount("PERCENTAGE", discountValue || 0)}>%</Button>
          <Button variant={discountType === "FIXED" ? "default" : "outline"} size="touch" className="flex-1 min-h-[48px]" onClick={() => setDiscount("FIXED", discountValue || 0)}>AED</Button>
        </div>
        <Label className="text-sm">Value</Label>
        <Input className="mt-1.5 h-12 text-base" type="number" min="0" step="0.01" value={discountValue || ""} onChange={(e) => setDiscount(discountType ?? "FIXED", Number(e.target.value) || 0)} />
        <Button
          className="mt-4 w-full min-h-[48px] text-base"
          size="touch"
          onClick={() => {
            const subtotal = usePosStore.getState().getSubtotal();
            if (subtotal <= 0) { setDiscountModal(false); return; }
            const rawDiscountAmount =
              discountType === "PERCENTAGE" && (discountValue ?? 0) > 0
                ? (subtotal * (discountValue ?? 0)) / 100
                : discountType === "FIXED" && (discountValue ?? 0) > 0
                  ? (discountValue ?? 0)
                  : 0;
            const productMap: Record<string, number> = {};
            for (const p of products) {
              if (p.minSellPrice != null && p.minSellPrice > 0) productMap[p._id] = p.minSellPrice;
            }
            let maxDiscountAmount = rawDiscountAmount;
            for (const item of items) {
              const minSell = productMap[item.productId];
              if (minSell == null) continue;
              const maxLineTotal = minSell * item.quantity;
              const maxAllocatable = item.totalPrice - maxLineTotal;
              if (maxAllocatable <= 0) {
                maxDiscountAmount = 0;
                break;
              }
              const maxForLine = (maxAllocatable * subtotal) / item.totalPrice;
              maxDiscountAmount = Math.min(maxDiscountAmount, maxForLine);
            }
            if (rawDiscountAmount > maxDiscountAmount && maxDiscountAmount >= 0) {
              if (discountType === "PERCENTAGE") {
                setDiscount("PERCENTAGE", subtotal > 0 ? (100 * maxDiscountAmount) / subtotal : 0);
              } else {
                setDiscount("FIXED", maxDiscountAmount);
              }
              alert(tErrors("discountCapped"));
            }
            setDiscountModal(false);
            focusScannerInput();
          }}
        >
          {tCommon("done")}
        </Button>
      </Modal>

      {/* Payment modal */}
      {paymentModal && (
        <PaymentModal
          grandTotal={totals.grandTotal}
          paymentMethods={paymentMethods}
          initialPaymentMethodId={paymentModalPreSelectId}
          onClose={() => { setPaymentModal(false); setPaymentModalPreSelectId(null); focusScannerInput(); }}
          onSubmit={submitPayment}
        />
      )}

      {/* IMEI modal */}
      <Modal open={!!imeiModal} onClose={() => { setImeiModal(null); focusScannerInput(); }} title={imeiModal ? tModals("selectImeiTitle", { name: imeiModal.product.name }) : ""} size="md">
        <div className="max-h-72 overflow-y-auto border border-slate-100 rounded-xl">
          {imeiModal?.imeis.filter((im) => im.status === "IN_STOCK").map((im) => {
            const inCart = items.some((i) => i.imeiId === im._id);
            return (
              <button
                key={im._id}
                type="button"
                disabled={inCart}
                className={`w-full border-b border-slate-50 px-4 py-4 text-left text-base font-mono min-h-[48px] last:border-0 ${inCart ? "cursor-not-allowed bg-slate-100 text-slate-400" : "hover:bg-teal-50"}`}
                onClick={() => handleSelectImei(im, imeiModal.product)}
              >
                <span>{im.imei}</span>
                {inCart && <span className="ms-2 text-xs text-slate-500">{t("alreadyInCart")}</span>}
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Sale success toast */}
      {lastSale && (() => {
        const s = lastSale;
        const shop = s.shop ?? { name: "Shop", address: "", phone: "", trnNumber: "", printSettings: undefined };
        const a4Props = { shopName: shop.name ?? "Shop", shopAddress: shop.address, shopPhone: shop.phone, trnNumber: shop.trnNumber, invoiceNumber: s.invoiceNumber, saleDate: s.saleDate, customerName: s.customerName, customerPhone: s.customerPhone, items: s.items, subtotal: s.subtotal, discountAmount: s.discountAmount, vatRate: s.vatRate, vatAmount: s.vatAmount, grandTotal: s.grandTotal, paidAmount: s.paidAmount, changeAmount: s.changeAmount, payments: s.payments, channel: s.channel, hasMarginSchemeItems: s.hasMarginSchemeItems, paperSize: shop.printSettings?.a4PaperSize };
        return (
          <>
            <div className="fixed bottom-4 end-4 z-40 animate-fade-in rounded-xl border border-teal-200 bg-white p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-600"><Check size={16} /></div>
                <p className="font-semibold text-slate-900">{t("saleCompleted", { invoiceNumber: s.invoiceNumber })}</p>
              </div>
              <div className="flex gap-2">
                <ThermalReceipt shopName={shop.name ?? "Shop"} shopAddress={shop.address} shopPhone={shop.phone} trnNumber={shop.trnNumber} invoiceNumber={s.invoiceNumber} saleDate={s.saleDate} customerName={s.customerName} customerPhone={s.customerPhone} items={s.items} subtotal={s.subtotal} discountAmount={s.discountAmount} vatRate={s.vatRate} vatAmount={s.vatAmount} grandTotal={s.grandTotal} paidAmount={s.paidAmount} changeAmount={s.changeAmount} payments={s.payments} channel={s.channel} hasMarginSchemeItems={s.hasMarginSchemeItems} printSettings={shop.printSettings} onPrintComplete={() => {}} trigger={(onClick) => (<Button size="sm" variant="outline" onClick={onClick}>{t("receipt")}</Button>)} />
                <Button size="sm" variant="outline" onClick={() => setA4LanguageModalOpen(true)}>{t("a4Invoice")}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setLastSale(null); setA4LanguageModalOpen(false); }}>{tCommon("close")}</Button>
              </div>
            </div>
            <Modal open={a4LanguageModalOpen} onClose={() => setA4LanguageModalOpen(false)} title={t("printInvoice")} size="sm">
              <p className="mb-4 text-sm text-slate-600">{t("printInvoice")} — {t("printInEnglish")} / {t("printInArabic")}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { printA4InvoicePdf(a4Props, { language: "en" }); setA4LanguageModalOpen(false); }}>{t("printInEnglish")}</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { printA4InvoicePdf(a4Props, { language: "ar" }); setA4LanguageModalOpen(false); }}>{t("printInArabic")}</Button>
              </div>
            </Modal>
          </>
        );
      })()}
    </div>
  );
}

function PaymentModal({ grandTotal, paymentMethods, initialPaymentMethodId, onClose, onSubmit }: { grandTotal: number; paymentMethods: PaymentMethod[]; initialPaymentMethodId?: string | null; onClose: () => void; onSubmit: (rows: { paymentMethodId: string; amount: number; reference?: string }[]) => void }) {
  const tModals = useTranslations("modals");
  const tForms = useTranslations("forms");
  const tErrors = useTranslations("errors");
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const [rows, setRows] = useState(() => [
    { paymentMethodId: initialPaymentMethodId ?? "", amount: String(grandTotal.toFixed(2)), reference: "" },
  ]);
  const totalEntered = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  function updateRow(i: number, field: string, value: string) {
    setRows((prev) => { const next = [...prev]; next[i] = { ...next[i], [field]: value }; return next; });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = rows.filter((r) => r.paymentMethodId && Number(r.amount) > 0);
    if (valid.length === 0) { alert(tErrors("selectPaymentAndAmount")); return; }
    for (const row of valid) {
      const method = paymentMethods.find((pm) => pm._id === row.paymentMethodId);
      if (method?.requiresReference && !row.reference.trim()) {
        alert(`Reference is required for ${method.name}`);
        return;
      }
    }
    onSubmit(valid.map((r) => ({ paymentMethodId: r.paymentMethodId, amount: Number(r.amount), reference: r.reference || undefined })));
  }

  return (
    <Modal open={true} onClose={onClose} title={tModals("payment")} size="lg">
      <p className="mb-5 text-xl font-bold text-slate-900">{tModals("total")}: {formatCurrency(grandTotal)}</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {rows.map((row, i) => (
          <div key={i} className="grid gap-3 md:grid-cols-[1fr_140px_1fr] md:items-end">
            <div className="flex-1">
              <Label className="text-sm">{tForms("method")}</Label>
              <select value={row.paymentMethodId} onChange={(e) => updateRow(i, "paymentMethodId", e.target.value)} className="mt-1.5 w-full h-12 rounded-xl border border-slate-200 bg-white px-4 py-2 text-base outline-none focus:border-teal-500">
                <option value="">{tCommon("select")}</option>
                {paymentMethods.map((pm) => (<option key={pm._id} value={pm._id}>{pm.name}{pm.type ? ` (${pm.type.replace(/_/g, " ")})` : ""}</option>))}
              </select>
            </div>
            <div>
              <Label className="text-sm">{tForms("amount")}</Label>
              <Input className="mt-1.5 h-12 text-base" type="number" step="0.01" min="0" value={row.amount} onChange={(e) => updateRow(i, "amount", e.target.value)} />
            </div>
            <div>
              <Label className="text-sm">
                {tForms("reference")}
                {paymentMethods.find((pm) => pm._id === row.paymentMethodId)?.requiresReference ? " *" : ""}
              </Label>
              <Input
                className="mt-1.5 h-12 text-base"
                value={row.reference}
                onChange={(e) => updateRow(i, "reference", e.target.value)}
                placeholder={paymentMethods.find((pm) => pm._id === row.paymentMethodId)?.provider || tForms("reference")}
              />
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="touch" className="min-h-[44px]" onClick={() => setRows((p) => [...p, { paymentMethodId: "", amount: "0", reference: "" }])}>
          {tModals("addPaymentMethodRow")}
        </Button>
        <div className="flex items-center justify-between pt-3 text-base">
          <span>{tModals("entered")}: {formatCurrency(totalEntered)}</span>
          {totalEntered >= grandTotal ? <span className="text-teal-600 font-semibold">{tModals("ready")}</span> : <span className="text-amber-600">{tModals("needMore", { amount: formatCurrency(grandTotal - totalEntered) })}</span>}
        </div>
        <div className="flex gap-3 pt-3">
          <Button type="button" variant="outline" size="touch" onClick={onClose} className="flex-1 min-h-[48px]">{tCommon("cancel")}</Button>
          <Button type="submit" size="touch" disabled={totalEntered < grandTotal} className="flex-1 min-h-[48px] text-base font-semibold">{tPages("completeSale")}</Button>
        </div>
      </form>
    </Modal>
  );
}
