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
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 14,
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
      @page { size: 50mm 30mm; margin: 2mm; }
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
      <div
        ref={ref}
        className="bg-white p-3 text-black border border-slate-200 rounded-lg"
        style={{
          width: "50mm",
          minHeight: "30mm",
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
        }}
      >
        {productName && (
          <div className="font-semibold text-sm truncate mb-1" style={{ maxWidth: "46mm" }}>
            {productName}
          </div>
        )}
        <div className="flex justify-center my-2">
          <svg ref={svgRef} />
        </div>
        <div className="text-center text-xs text-slate-600 font-mono">{barcode}</div>
        {price != null && (
          <div className="text-center font-semibold text-sm mt-1">{formatCurrency(price)}</div>
        )}
      </div>
      {trigger(handlePrintClick)}
    </>
  );
}
