"use client";

import React, { useRef, useEffect, useCallback } from "react";
import useSWR from "swr";
import { useReactToPrint } from "react-to-print";
import JsBarcode from "jsbarcode";
import { formatCurrency } from "@/lib/utils";
import { swrFetcher } from "@/lib/swr-fetcher";

type BarcodeLabelProps = {
  barcode: string;
  productName?: string;
  price?: number;
  shopName?: string;
  costCode?: string;
  onPrintComplete?: () => void;
  trigger: (onClick: () => void) => React.ReactNode;
};

export function BarcodeLabel({
  barcode,
  productName,
  price,
  shopName,
  costCode,
  onPrintComplete,
  trigger,
}: BarcodeLabelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { data: shop } = useSWR<{ name?: string }>("/api/shop", swrFetcher);
  const resolvedShopName = shopName ?? shop?.name ?? "";

  useEffect(() => {
    if (!barcode || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, barcode, {
        format: "CODE128",
        width: 1.0,
        height: 26,
        displayValue: false,
        margin: 0,
      });
    } catch {
      // Invalid barcode string - ignore
    }
  }, [barcode]);

  const handlePrint = useReactToPrint({
    contentRef: ref,
    documentTitle: `Barcode-${barcode}`,
    onAfterPrint: onPrintComplete,
    pageStyle: `
      @page { size: 40mm 25mm; margin: 0; }
      @media print {
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 40mm !important;
          height: 25mm !important;
          min-height: 25mm !important;
          max-height: 25mm !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          page-break-after: avoid;
          page-break-inside: avoid;
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
      {/* Printable area: shop name + product + price + barcode for small thermal printers */}
      <div
        ref={ref}
        className="bg-white p-1.5 text-black border border-slate-200 rounded-lg print:break-inside-avoid print:break-after-avoid flex flex-col justify-between"
        style={{
          width: "40mm",
          height: "25mm",
          minHeight: "25mm",
          maxHeight: "25mm",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div className="flex flex-col items-center gap-0.5 mb-0.5">
          {resolvedShopName && (
            <div className="text-center text-[9px] font-semibold text-slate-900 leading-tight truncate max-w-full">
              {resolvedShopName}
            </div>
          )}
          {(productName || price != null) && (
            <div className="text-center leading-tight max-w-full">
              {productName && (
                <div className="text-[8px] text-slate-800 truncate max-w-full">
                  {productName}
                </div>
              )}
              {price != null && (
                <div className="text-[8px] text-slate-700">
                  {formatCurrency(price)}
                </div>
              )}
            </div>
          )}
        </div>
        <div
          className="flex justify-center items-center mt-0.5"
          style={{ height: "12mm" }}
        >
          <svg ref={svgRef} />
        </div>
        <div className="mt-0.5 flex items-center justify-center text-[10px] text-slate-700 font-mono">
          <span>{barcode}</span>
          {costCode && (
            <>
              <span className="mx-1 text-slate-400">|</span>
              <span className="text-[9px] font-semibold">{costCode}</span>
            </>
          )}
        </div>
      </div>
      {trigger(handlePrintClick)}
    </>
  );
}
