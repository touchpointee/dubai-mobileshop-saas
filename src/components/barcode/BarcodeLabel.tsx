"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { useReactToPrint } from "react-to-print";
import JsBarcode from "jsbarcode";
import { formatCurrency } from "@/lib/utils";

type BarcodeLabelProps = {
  barcode: string;
  productName?: string;
  price?: number;
  onPrintComplete?: () => void;
  trigger: (onClick: () => void) => React.ReactNode;
};

export function BarcodeLabel({
  barcode,
  productName,
  price,
  onPrintComplete,
  trigger,
}: BarcodeLabelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!barcode || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, barcode, {
        format: "CODE128",
        width: 1.2,
        height: 36,
        displayValue: true,
        fontSize: 10,
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
      @page { size: 40mm 25mm; margin: 2mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
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
      {/* Printable area: barcode + number only for small thermal printers */}
      <div
        ref={ref}
        className="bg-white p-2 text-black border border-slate-200 rounded-lg"
        style={{
          width: "40mm",
          minHeight: "25mm",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div className="flex justify-center items-center flex-1 min-h-0">
          <svg ref={svgRef} />
        </div>
        <div className="text-center text-[10px] text-slate-700 font-mono mt-0.5">{barcode}</div>
      </div>
      {/* Optional on-screen caption (not printed) */}
      {(productName != null || price != null) && (
        <div className="mt-2 text-center text-xs text-slate-500 print:hidden">
          {productName && <div className="font-medium truncate max-w-[40mm] mx-auto">{productName}</div>}
          {price != null && <div className="mt-0.5">{formatCurrency(price)}</div>}
        </div>
      )}
      {trigger(handlePrintClick)}
    </>
  );
}
