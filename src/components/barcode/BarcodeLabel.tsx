"use client";

import React, { useRef, useEffect, useCallback } from "react";
import useSWR from "swr";
import { useReactToPrint } from "react-to-print";
import JsBarcode from "jsbarcode";
import { formatCurrency } from "@/lib/utils";
import { swrFetcher } from "@/lib/swr-fetcher";

export type BarcodeFormat = "CODE128" | "EAN13" | "CODE39" | "EAN8";

export type LabelConfig = {
  width: number;
  height: number;
  showShopName: boolean;
  showProductName: boolean;
  showPrice: boolean;
  showBarcode: boolean;
  showBarcodeNumber: boolean;
  showBorders: boolean;
  productNameSize: number;
  priceSize: number;
  barcodeHeight: number;
  barcodeNumberSize: number;
  barcodeFormat: BarcodeFormat;
  rotate180: boolean;
};

export const defaultLabelConfig: LabelConfig = {
  width: 38,
  height: 26,
  showShopName: true,
  showProductName: true,
  showPrice: true,
  showBarcode: true,
  showBarcodeNumber: true,
  showBorders: false,
  productNameSize: 8,
  priceSize: 9,
  barcodeHeight: 26,
  barcodeNumberSize: 7,
  barcodeFormat: "CODE128",
  rotate180: false,
};

type LabelContentProps = {
  barcode: string;
  productName?: string;
  price?: number;
  shopName?: string;
  costCode?: string;
  config: LabelConfig;
};

export function BarcodeLabelContent({
  barcode,
  productName,
  price,
  shopName,
  costCode,
  config,
}: LabelContentProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !config.showBarcode) return;
    const value = barcode || "00000000";
    try {
      JsBarcode(svgRef.current, value, {
        format: config.barcodeFormat,
        width: 1.0,
        height: config.barcodeHeight,
        displayValue: false,
        margin: 0,
      });
    } catch {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: 1.0,
          height: config.barcodeHeight,
          displayValue: false,
          margin: 0,
        });
      } catch {
        // ignore invalid barcode string
      }
    }
  }, [barcode, config.showBarcode, config.barcodeFormat, config.barcodeHeight]);

  return (
    <div
      className={`barcode-print-box bg-white text-black flex flex-col${config.showBorders ? " border border-slate-400" : ""}`}
      style={{
        width: `${config.width}mm`,
        height: `${config.height}mm`,
        minWidth: `${config.width}mm`,
        maxWidth: `${config.width}mm`,
        minHeight: `${config.height}mm`,
        maxHeight: `${config.height}mm`,
        fontFamily: "system-ui, sans-serif",
        padding: "1mm",
        boxSizing: "border-box",
        overflow: "hidden",
        justifyContent: "space-between",
      }}
    >
      <div className="flex flex-col items-center" style={{ gap: "0.5px" }}>
        {config.showShopName && shopName && (
          <div
            className="text-center font-semibold text-slate-900 leading-tight truncate max-w-full"
            style={{ fontSize: `${Math.max(6, config.productNameSize - 1)}px` }}
          >
            {shopName}
          </div>
        )}
        {config.showProductName && productName && (
          <div
            className="text-center text-slate-800 leading-tight max-w-full"
            style={{ fontSize: `${config.productNameSize}px`, wordBreak: "break-word" }}
          >
            {productName}
          </div>
        )}
        {config.showPrice && price != null && (
          <div
            className="text-center text-slate-900 font-bold leading-tight"
            style={{ fontSize: `${config.priceSize}px` }}
          >
            {formatCurrency(price)}
          </div>
        )}
      </div>

      {config.showBarcode && (
        <div
          className="flex justify-center items-center flex-1 overflow-hidden"
          style={{ minHeight: 0 }}
        >
          <svg ref={svgRef} style={{ maxWidth: "100%", display: "block" }} />
        </div>
      )}

      {config.showBarcodeNumber && (
        <div
          className="flex items-center justify-center text-slate-700 font-mono leading-none"
          style={{ fontSize: `${config.barcodeNumberSize}px` }}
        >
          <span>{barcode}</span>
          {costCode && (
            <>
              <span className="mx-0.5 text-slate-400">|</span>
              <span className="font-semibold">{costCode}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

type BarcodeLabelProps = {
  barcode: string;
  productName?: string;
  price?: number;
  shopName?: string;
  costCode?: string;
  config?: LabelConfig;
  copies?: number;
  onPrintComplete?: () => void;
  trigger: (onClick: () => void) => React.ReactNode;
};

export function BarcodeLabel({
  barcode,
  productName,
  price,
  shopName,
  costCode,
  config = defaultLabelConfig,
  copies = 1,
  onPrintComplete,
  trigger,
}: BarcodeLabelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { data: shop } = useSWR<{ name?: string }>("/api/shop", swrFetcher);
  const resolvedShopName = shopName ?? shop?.name ?? "";

  const handlePrint = useReactToPrint({
    contentRef: ref,
    documentTitle: barcode,
    onAfterPrint: onPrintComplete,
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
        .barcode-print-box:last-child {
          page-break-after: avoid;
        }
      }
    `,
  });

  const handlePrintClick = useCallback(() => {
    if (ref.current) {
      handlePrint();
      return;
    }
    requestAnimationFrame(() => {
      if (ref.current) handlePrint();
      else setTimeout(() => { if (ref.current) handlePrint(); }, 100);
    });
  }, [handlePrint]);

  return (
    <>
      {/* Outer wrapper hides on screen; react-to-print clones only the inner ref div */}
      <div aria-hidden="true" style={{ overflow: "hidden", height: 0, position: "absolute" }}>
        <div ref={ref} style={{ width: `${config.width}mm` }}>
          {Array.from({ length: copies }).map((_, i) => (
            <BarcodeLabelContent
              key={i}
              barcode={barcode}
              productName={productName}
              price={price}
              shopName={config.showShopName ? resolvedShopName : undefined}
              costCode={costCode}
              config={config}
            />
          ))}
        </div>
      </div>
      {trigger(handlePrintClick)}
    </>
  );
}
