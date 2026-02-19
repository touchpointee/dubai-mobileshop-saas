"use client";

import React, { useRef, useCallback } from "react";
import { useReactToPrint } from "react-to-print";
import { formatCurrency, formatDate } from "@/lib/utils";

type SaleItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imei?: string;
};

type SalePayment = { methodName: string; amount: number };

type ThermalReceiptProps = {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  trnNumber?: string;
  invoiceNumber: string;
  saleDate: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  payments: SalePayment[];
  channel: "VAT" | "NON_VAT";
  onPrintComplete?: () => void;
  trigger: (onClick: () => void) => React.ReactNode;
};

export function ThermalReceipt({
  shopName,
  shopAddress,
  shopPhone,
  trnNumber,
  invoiceNumber,
  saleDate,
  customerName,
  customerPhone,
  items,
  subtotal,
  discountAmount,
  vatRate,
  vatAmount,
  grandTotal,
  paidAmount,
  changeAmount,
  payments,
  channel,
  onPrintComplete,
  trigger,
}: ThermalReceiptProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handlePrintFromLib = useReactToPrint({
    contentRef: ref,
    documentTitle: `Invoice-${invoiceNumber}`,
    onAfterPrint: onPrintComplete,
    onPrintError: (_err, data) => {
      if (typeof window !== "undefined") {
        console.error("Print failed:", data);
      }
    },
    pageStyle: `
      @page { size: 80mm auto; margin: 2mm; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    `,
  });

  const handlePrint = useCallback(() => {
    if (ref.current) {
      handlePrintFromLib();
      return;
    }
    requestAnimationFrame(() => {
      if (ref.current) handlePrintFromLib();
      else setTimeout(() => { if (ref.current) handlePrintFromLib(); }, 100);
    });
  }, [handlePrintFromLib]);

  return (
    <>
      {trigger(handlePrint)}
      <div className="print-only-receipt" style={{ position: "absolute", left: "-9999px", top: 0, width: "80mm" }} aria-hidden="true">
        <div ref={ref} className="bg-white p-2 text-black" style={{ width: "80mm", fontFamily: "monospace", fontSize: "12px" }}>
          <div className="text-center font-bold text-sm">{shopName}</div>
          {shopAddress && <div className="text-center text-xs">{shopAddress}</div>}
          {shopPhone && <div className="text-center text-xs">{shopPhone}</div>}
          {channel === "VAT" && trnNumber && <div className="text-center text-xs">TRN: {trnNumber}</div>}
          <div className="my-2 border-t border-dashed border-black" />
          <div className="flex justify-between text-xs">
            <span>Invoice: {invoiceNumber}</span>
            <span>{formatDate(saleDate)}</span>
          </div>
          {(customerName || customerPhone) && (
            <div className="mt-1 text-xs">
              Customer: {customerName || "-"} {customerPhone ? ` | ${customerPhone}` : ""}
            </div>
          )}
          <div className="my-2 border-t border-dashed border-black" />
          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-xs py-0.5">
              <span className="flex-1 truncate">
                {item.quantity} x {item.productName} {item.imei ? `(${item.imei})` : ""}
              </span>
              <span>{formatCurrency(item.totalPrice)}</span>
            </div>
          ))}
          <div className="my-2 border-t border-dashed border-black" />
          <div className="flex justify-between text-xs">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-green-700">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {channel === "VAT" && vatAmount > 0 && (
            <div className="flex justify-between text-xs">
              <span>VAT ({vatRate}%)</span>
              <span>{formatCurrency(vatAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm mt-1">
            <span>Total</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
          {payments.length > 0 && (
            <>
              <div className="mt-1 text-xs">Payment:</div>
              {payments.map((p, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>{p.methodName}</span>
                  <span>{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </>
          )}
          <div className="flex justify-between text-xs mt-1">
            <span>Paid</span>
            <span>{formatCurrency(paidAmount)}</span>
          </div>
          {changeAmount > 0 && (
            <div className="flex justify-between text-xs">
              <span>Change</span>
              <span>{formatCurrency(changeAmount)}</span>
            </div>
          )}
          <div className="my-2 border-t border-dashed border-black" />
          <div className="text-center text-xs">Thank you</div>
        </div>
      </div>
    </>
  );
}
