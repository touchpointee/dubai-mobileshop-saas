"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useReactToPrint } from "react-to-print";
import useSWR from "swr";
import { Printer } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { swrFetcher } from "@/lib/swr-fetcher";
import { encodeCostWithFalseCode } from "@/lib/cost-code";
import {
  BarcodeLabelContent,
  defaultLabelConfig,
  type LabelConfig,
  type BarcodeFormat,
} from "@/components/barcode/BarcodeLabel";

const STORAGE_KEY = "barcode-label-config";

function loadConfig(): LabelConfig {
  if (typeof window === "undefined") return defaultLabelConfig;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultLabelConfig, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return defaultLabelConfig;
}

function saveConfig(config: LabelConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

type Product = {
  _id: string;
  name: string;
  costPrice: number;
  sellPrice: number;
  barcode?: string;
};

type Props = {
  product: Product | null;
  open: boolean;
  onClose: () => void;
};

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none py-0.5">
      <span className="text-sm text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${
          checked ? "bg-teal-500" : "bg-slate-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function RangeSlider({
  label,
  value,
  min,
  max,
  unit = "px",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-xs font-mono text-teal-600 font-medium">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full cursor-pointer accent-teal-500"
      />
    </div>
  );
}

export function BarcodePrintConfig({ product, open, onClose }: Props) {
  const [config, setConfig] = useState<LabelConfig>(defaultLabelConfig);
  const [copies, setCopies] = useState(1);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setConfig(loadConfig());
  }, [open]);

  const { data: shop } = useSWR<{
    name?: string;
    costCodeMap?: Record<string, string>;
    costFalseCode?: string;
  }>(open ? "/api/shop" : null, swrFetcher);

  const shopName = shop?.name ?? "";
  const barcode = product?.barcode ?? (product ? `BC-${product._id}` : "");
  const costCode =
    shop && product && typeof product.costPrice === "number"
      ? (encodeCostWithFalseCode({
          costPrice: product.costPrice,
          sellPrice: product.sellPrice,
          costCodeMap: shop.costCodeMap,
          falseCode: shop.costFalseCode,
        }) ?? undefined)
      : undefined;

  function updateConfig(updates: Partial<LabelConfig>) {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      saveConfig(next);
      return next;
    });
  }

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `barcode-${barcode}`,
    pageStyle: `
      @page {
        size: ${config.width}mm ${config.height}mm;
        margin: 0;
      }
      @media print {
        * { margin: 0 !important; padding: 0 !important; box-sizing: border-box !important; }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: ${config.width}mm !important;
          height: ${config.height}mm !important;
          min-width: ${config.width}mm !important;
          max-width: ${config.width}mm !important;
          min-height: ${config.height}mm !important;
          max-height: ${config.height}mm !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .barcode-print-box {
          page-break-after: always;
          page-break-inside: avoid;
          width: ${config.width}mm !important;
          height: ${config.height}mm !important;
          ${config.rotate180 ? "transform: rotate(180deg); transform-origin: center;" : ""}
        }
      }
    `,
    onAfterPrint: onClose,
  });

  const handlePrintClick = useCallback(() => {
    if (printRef.current) {
      handlePrint();
      return;
    }
    requestAnimationFrame(() => {
      if (printRef.current) handlePrint();
    });
  }, [handlePrint]);

  if (!product) return null;

  return (
    <Modal open={open} onClose={onClose} title="Print Barcode Labels" size="2xl">
      {/*
        Screen-hide wrapper: overflow+height:0 hides visually.
        react-to-print clones only the INNER printRef div (no position styles),
        so content appears correctly in the print iframe.
      */}
      <div aria-hidden="true" style={{ overflow: "hidden", height: 0, position: "absolute" }}>
        <div ref={printRef} style={{ width: `${config.width}mm` }}>
          {Array.from({ length: copies }).map((_, i) => (
            <BarcodeLabelContent
              key={i}
              barcode={barcode}
              productName={product.name}
              price={product.sellPrice}
              shopName={config.showShopName ? shopName : undefined}
              costCode={costCode}
              config={config}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-5 min-h-0 flex-1">
        {/* ── Left: Config panel ── */}
        <div className="w-60 shrink-0 overflow-y-auto space-y-5 pr-3 border-r border-slate-100">

          {/* Layout */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Layout
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-slate-600">Width (mm)</Label>
                <Input
                  type="number"
                  className="mt-1 h-8 text-sm"
                  min={20}
                  max={120}
                  value={config.width}
                  onChange={(e) => updateConfig({ width: Math.max(20, Number(e.target.value)) })}
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">Height (mm)</Label>
                <Input
                  type="number"
                  className="mt-1 h-8 text-sm"
                  min={15}
                  max={120}
                  value={config.height}
                  onChange={(e) => updateConfig({ height: Math.max(15, Number(e.target.value)) })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Copies</Label>
              <Input
                type="number"
                className="mt-1 h-8 text-sm"
                min={1}
                max={100}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Math.min(100, Number(e.target.value))))}
              />
            </div>
          </section>

          {/* Display */}
          <section className="space-y-0.5">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
              Display
            </h3>
            <ToggleSwitch
              label="Shop name"
              checked={config.showShopName}
              onChange={(v) => updateConfig({ showShopName: v })}
            />
            <ToggleSwitch
              label="Product name"
              checked={config.showProductName}
              onChange={(v) => updateConfig({ showProductName: v })}
            />
            <ToggleSwitch
              label="Price"
              checked={config.showPrice}
              onChange={(v) => updateConfig({ showPrice: v })}
            />
            <ToggleSwitch
              label="Barcode"
              checked={config.showBarcode}
              onChange={(v) => updateConfig({ showBarcode: v })}
            />
            <ToggleSwitch
              label="Barcode number"
              checked={config.showBarcodeNumber}
              onChange={(v) => updateConfig({ showBarcodeNumber: v })}
            />
            <ToggleSwitch
              label="Borders"
              checked={config.showBorders}
              onChange={(v) => updateConfig({ showBorders: v })}
            />
          </section>

          {/* Barcode Type */}
          <section className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Barcode Type
            </h3>
            <select
              className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={config.barcodeFormat}
              onChange={(e) => updateConfig({ barcodeFormat: e.target.value as BarcodeFormat })}
            >
              <option value="CODE128">CODE128 (recommended)</option>
              <option value="EAN13">EAN13 — 12-digit only</option>
              <option value="CODE39">CODE39</option>
              <option value="EAN8">EAN8 — 7-digit only</option>
            </select>
            {(config.barcodeFormat === "EAN13" || config.barcodeFormat === "EAN8") && (
              <p className="text-[10px] text-amber-600 leading-tight">
                {config.barcodeFormat === "EAN13"
                  ? "EAN13 requires exactly 12 numeric digits. Non-matching barcodes fall back to CODE128."
                  : "EAN8 requires exactly 7 numeric digits. Non-matching barcodes fall back to CODE128."}
              </p>
            )}
          </section>

          {/* Sizes */}
          <section className="space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Sizes
            </h3>
            <RangeSlider
              label="Product name size"
              value={config.productNameSize}
              min={6}
              max={14}
              onChange={(v) => updateConfig({ productNameSize: v })}
            />
            <RangeSlider
              label="Price size"
              value={config.priceSize}
              min={6}
              max={16}
              onChange={(v) => updateConfig({ priceSize: v })}
            />
            <RangeSlider
              label="Barcode height"
              value={config.barcodeHeight}
              min={15}
              max={50}
              onChange={(v) => updateConfig({ barcodeHeight: v })}
            />
            <RangeSlider
              label="Barcode number & code"
              value={config.barcodeNumberSize}
              min={5}
              max={14}
              onChange={(v) => updateConfig({ barcodeNumberSize: v })}
            />
          </section>

          {/* Printer */}
          <section className="space-y-2">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Printer
            </h3>
            <ToggleSwitch
              label="Rotate 180° (EPL driver)"
              checked={config.rotate180}
              onChange={(v) => updateConfig({ rotate180: v })}
            />
            {config.rotate180 && (
              <p className="text-[10px] text-teal-700 bg-teal-50 rounded px-2 py-1.5 leading-snug">
                Enable this if your Zebra / EPL printer prints upside down. The preview will look flipped but the physical label will be correct.
              </p>
            )}
          </section>

          <Button className="w-full" onClick={handlePrintClick}>
            <Printer size={15} className="mr-2" />
            Print {copies > 1 ? `${copies} Labels` : "Label"}
          </Button>
        </div>

        {/* ── Right: Live preview ── */}
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-xl min-h-0 overflow-hidden">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">
            Preview
          </p>
          <div
            className="shadow-md ring-1 ring-slate-200"
            style={config.rotate180 ? { transform: "rotate(180deg)" } : undefined}
          >
            <BarcodeLabelContent
              barcode={barcode}
              productName={product.name}
              price={product.sellPrice}
              shopName={config.showShopName ? shopName : undefined}
              costCode={costCode}
              config={config}
            />
          </div>
          <p className="text-xs text-slate-400 mt-3 tabular-nums">
            {config.width} × {config.height} mm &nbsp;·&nbsp; {copies}{" "}
            {copies === 1 ? "copy" : "copies"}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Settings saved automatically
          </p>
        </div>
      </div>
    </Modal>
  );
}
