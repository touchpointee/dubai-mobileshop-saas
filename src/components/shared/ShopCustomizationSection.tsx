"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Shortcut = {
  label: string;
  href: string;
  enabled: boolean;
  order: number;
};

type PrintSettings = {
  thermalPaperWidthMm: number;
  thermalMarginMm: number;
  thermalFontSizePx: number;
  receiptFooter: string;
  showTrnOnReceipt: boolean;
  defaultInvoiceLanguage: "en" | "ar";
  a4PaperSize: "A4" | "A5";
};

type ShopResponse = {
  adminShortcuts?: Shortcut[];
  printSettings?: Partial<PrintSettings>;
};

const SWR_KEY = "/api/shop";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

const defaultShortcuts: Shortcut[] = [
  { label: "POS", href: "/vat/pos", enabled: true, order: 1 },
  { label: "Products", href: "/vat/products", enabled: true, order: 2 },
  { label: "Purchases", href: "/vat/purchases", enabled: true, order: 3 },
  { label: "Stock Report", href: "/vat/reports/stock", enabled: true, order: 4 },
  { label: "VAT Report", href: "/vat/reports/vat", enabled: true, order: 5 },
];

const defaultPrintSettings: PrintSettings = {
  thermalPaperWidthMm: 80,
  thermalMarginMm: 2,
  thermalFontSizePx: 12,
  receiptFooter: "Thank you",
  showTrnOnReceipt: true,
  defaultInvoiceLanguage: "en",
  a4PaperSize: "A4",
};

function normalizePrintSettings(value?: Partial<PrintSettings>): PrintSettings {
  return {
    ...defaultPrintSettings,
    ...(value ?? {}),
    defaultInvoiceLanguage: value?.defaultInvoiceLanguage === "ar" ? "ar" : "en",
    a4PaperSize: value?.a4PaperSize === "A5" ? "A5" : "A4",
  };
}

export function ShopCustomizationSection() {
  const { data: shop } = useSWR<ShopResponse>(SWR_KEY, fetcher);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(defaultShortcuts);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(defaultPrintSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shop?.adminShortcuts?.length) {
      setShortcuts(
        shop.adminShortcuts
          .map((item, index) => ({
            label: item.label ?? "",
            href: item.href ?? "",
            enabled: item.enabled !== false,
            order: Number(item.order) || index + 1,
          }))
          .sort((a, b) => a.order - b.order)
      );
    }
    if (shop?.printSettings) {
      setPrintSettings(normalizePrintSettings(shop.printSettings));
    }
  }, [shop?.adminShortcuts, shop?.printSettings]);

  function updateShortcut(index: number, patch: Partial<Shortcut>) {
    setShortcuts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addShortcut() {
    setShortcuts((prev) => [
      ...prev,
      { label: "New shortcut", href: "/vat/dashboard", enabled: true, order: prev.length + 1 },
    ]);
  }

  function removeShortcut(index: number) {
    setShortcuts((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i + 1 })));
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        adminShortcuts: shortcuts.map((item, index) => ({ ...item, order: index + 1 })),
        printSettings,
      };
      const res = await fetch(SWR_KEY, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await mutate(SWR_KEY);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to save customization");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Shop customization" description="Customize admin shortcuts and printer setup for this shop." />
      <form onSubmit={saveSettings} className="mx-6 mb-6 space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Admin portal shortcuts</h3>
              <p className="mt-1 text-sm text-slate-500">Enabled shortcuts appear at the top of this shop admin sidebar.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addShortcut}>
              <Plus size={16} className="mr-1.5" />
              Add
            </Button>
          </div>

          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="grid gap-3 rounded-lg border border-slate-100 p-3 md:grid-cols-[90px_1fr_1.5fr_44px] md:items-end">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 md:pb-2">
                  <input
                    type="checkbox"
                    checked={shortcut.enabled}
                    onChange={(e) => updateShortcut(index, { enabled: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Show
                </label>
                <div>
                  <Label>Label</Label>
                  <Input value={shortcut.label} onChange={(e) => updateShortcut(index, { label: e.target.value })} />
                </div>
                <div>
                  <Label>Link</Label>
                  <Input value={shortcut.href} onChange={(e) => updateShortcut(index, { href: e.target.value })} placeholder="/vat/pos" />
                </div>
                <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => removeShortcut(index)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-900">Print setup</h3>
            <p className="mt-1 text-sm text-slate-500">Tune receipts for each shop printer and paper roll.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Thermal paper width (mm)</Label>
              <Input
                type="number"
                min="48"
                max="110"
                value={printSettings.thermalPaperWidthMm}
                onChange={(e) => setPrintSettings((p) => ({ ...p, thermalPaperWidthMm: Number(e.target.value) || 80 }))}
              />
            </div>
            <div>
              <Label>Thermal margin (mm)</Label>
              <Input
                type="number"
                min="0"
                max="10"
                value={printSettings.thermalMarginMm}
                onChange={(e) => setPrintSettings((p) => ({ ...p, thermalMarginMm: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Receipt font size (px)</Label>
              <Input
                type="number"
                min="9"
                max="18"
                value={printSettings.thermalFontSizePx}
                onChange={(e) => setPrintSettings((p) => ({ ...p, thermalFontSizePx: Number(e.target.value) || 12 }))}
              />
            </div>
            <div>
              <Label>Default invoice language</Label>
              <select
                value={printSettings.defaultInvoiceLanguage}
                onChange={(e) => setPrintSettings((p) => ({ ...p, defaultInvoiceLanguage: e.target.value === "ar" ? "ar" : "en" }))}
                className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </div>
            <div>
              <Label>A4 invoice paper</Label>
              <select
                value={printSettings.a4PaperSize}
                onChange={(e) => setPrintSettings((p) => ({ ...p, a4PaperSize: e.target.value === "A5" ? "A5" : "A4" }))}
                className="mt-1.5 flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="A4">A4</option>
                <option value="A5">A5</option>
              </select>
            </div>
            <label className="flex items-center gap-2 pt-6 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={printSettings.showTrnOnReceipt}
                onChange={(e) => setPrintSettings((p) => ({ ...p, showTrnOnReceipt: e.target.checked }))}
                className="h-4 w-4 rounded border-slate-300"
              />
              Show TRN on receipts
            </label>
          </div>

          <div className="mt-4">
            <Label>Receipt footer</Label>
            <Input
              value={printSettings.receiptFooter}
              onChange={(e) => setPrintSettings((p) => ({ ...p, receiptFooter: e.target.value }))}
              placeholder="Thank you"
            />
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save customization"}</Button>
        </div>
      </form>
    </div>
  );
}
