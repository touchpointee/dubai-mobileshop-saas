"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ThermalReceipt } from "@/components/receipts/ThermalReceipt";
import { printA4InvoicePdf } from "@/components/receipts/A4Invoice";
import type { Channel } from "@/lib/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SaleListItem = {
  _id: string;
  invoiceNumber: string;
  customerName?: string;
  grandTotal: number;
  saleDate: string;
  status: string;
  soldBy?: { name: string };
};

type FullSale = SaleListItem & {
  customerPhone?: string;
  items: { productName: string; quantity: number; unitPrice: number; totalPrice: number; imei?: string }[];
  payments: { methodName: string; amount: number }[];
  subtotal: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  paidAmount: number;
  changeAmount: number;
  channel: "VAT" | "NON_VAT";
  shopId?: { name?: string; address?: string; phone?: string; trnNumber?: string };
};

function shopFromSale(sale: FullSale) {
  const s = sale.shopId;
  return {
    name: s?.name ?? "Shop",
    address: s?.address ?? "",
    phone: s?.phone ?? "",
    trnNumber: s?.trnNumber ?? "",
  };
}

export function SalesHistoryContent({
  channel,
  titleKey = "salesHistory",
  descriptionKey,
}: {
  channel: Channel;
  titleKey?: string;
  descriptionKey?: string;
}) {
  const t = useTranslations("pages");
  const tCommon = useTranslations("common");
  const apiChannel = channel === "VAT" ? "VAT" : "NON_VAT";
  const { data: sales, isLoading } = useSWR<SaleListItem[]>(`/api/sales?channel=${apiChannel}`, fetcher);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [a4LanguageModalOpen, setA4LanguageModalOpen] = useState(false);

  const { data: fullSale, isLoading: loadingSale } = useSWR<FullSale | null>(
    selectedSaleId ? `/api/sales/${selectedSaleId}` : null,
    fetcher
  );

  const openBill = useCallback((row: SaleListItem) => {
    setSelectedSaleId(row._id);
  }, []);

  const closeBill = useCallback(() => {
    setSelectedSaleId(null);
    setA4LanguageModalOpen(false);
  }, []);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t(titleKey)}
        description={descriptionKey ? t(descriptionKey) : undefined}
      />
      <div className="px-6">
        <DataTable
          columns={[
            { key: "invoiceNumber", header: "Invoice" },
            { key: "customerName", header: "Customer", render: (s) => s.customerName || "Walk-in" },
            { key: "grandTotal", header: "Total", render: (s) => formatCurrency(s.grandTotal) },
            { key: "saleDate", header: "Date", render: (s) => formatDate(s.saleDate) },
            { key: "status", header: "Status", render: (s) => (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${apiChannel === "VAT" ? "bg-teal-50 text-teal-700" : "bg-slate-100 text-slate-700"}`}>
                {s.status}
              </span>
            )},
            { key: "soldBy", header: "Sold By", render: (s) => (typeof s.soldBy === "object" ? s.soldBy?.name : "-") },
          ]}
          data={sales || []}
          emptyMessage="No sales yet."
          onRowClick={openBill}
        />
      </div>

      <Modal
        open={!!selectedSaleId}
        onClose={closeBill}
        title={fullSale ? `Sale — ${fullSale.invoiceNumber}` : "Sale bill"}
        size="md"
      >
        {loadingSale && (
          <p className="text-sm text-slate-500 py-4">{tCommon("loading")}</p>
        )}
        {!loadingSale && fullSale && (() => {
          const shop = shopFromSale(fullSale);
          return (
            <div className="space-y-4">
              <div className="text-sm text-slate-600">
                <p>{formatDate(fullSale.saleDate)} · {fullSale.customerName || "Walk-in"}</p>
                <p className="font-medium text-slate-900 mt-1">{formatCurrency(fullSale.grandTotal)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ThermalReceipt
                  shopName={shop.name}
                  shopAddress={shop.address}
                  shopPhone={shop.phone}
                  trnNumber={shop.trnNumber}
                  invoiceNumber={fullSale.invoiceNumber}
                  saleDate={fullSale.saleDate}
                  customerName={fullSale.customerName}
                  customerPhone={fullSale.customerPhone}
                  items={fullSale.items}
                  subtotal={fullSale.subtotal}
                  discountAmount={fullSale.discountAmount}
                  vatRate={fullSale.vatRate}
                  vatAmount={fullSale.vatAmount}
                  grandTotal={fullSale.grandTotal}
                  paidAmount={fullSale.paidAmount}
                  changeAmount={fullSale.changeAmount}
                  payments={fullSale.payments}
                  channel={fullSale.channel}
                  onPrintComplete={() => {}}
                  trigger={(onClick) => (
                    <Button type="button" size="sm" variant="outline" onClick={onClick}>
                      {t("receipt")}
                    </Button>
                  )}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setA4LanguageModalOpen(true)}
                >
                  {t("a4Invoice")}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={closeBill}>
                  {tCommon("close")}
                </Button>
              </div>
            </div>
          );
        })()}
        {!loadingSale && selectedSaleId && !fullSale && (
          <p className="text-sm text-slate-500 py-4">Sale not found.</p>
        )}
      </Modal>

      <Modal open={a4LanguageModalOpen} onClose={() => setA4LanguageModalOpen(false)} title={t("printInvoice")} size="sm">
        <p className="mb-4 text-sm text-slate-600">{t("printInvoice")} — {t("printInEnglish")} / {t("printInArabic")}</p>
        {fullSale && (() => {
          const shop = shopFromSale(fullSale);
          const a4Props = {
            shopName: shop.name,
            shopAddress: shop.address,
            shopPhone: shop.phone,
            trnNumber: shop.trnNumber,
            invoiceNumber: fullSale.invoiceNumber,
            saleDate: fullSale.saleDate,
            customerName: fullSale.customerName,
            customerPhone: fullSale.customerPhone,
            items: fullSale.items,
            subtotal: fullSale.subtotal,
            discountAmount: fullSale.discountAmount,
            vatRate: fullSale.vatRate,
            vatAmount: fullSale.vatAmount,
            grandTotal: fullSale.grandTotal,
            paidAmount: fullSale.paidAmount,
            changeAmount: fullSale.changeAmount,
            payments: fullSale.payments,
            channel: fullSale.channel,
          };
          return (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { printA4InvoicePdf(a4Props, { language: "en" }); setA4LanguageModalOpen(false); }}>{t("printInEnglish")}</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { printA4InvoicePdf(a4Props, { language: "ar" }); setA4LanguageModalOpen(false); }}>{t("printInArabic")}</Button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
