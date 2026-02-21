"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

export type A4InvoiceLanguage = "en" | "ar";

const A4_INVOICE_LABELS: Record<
  A4InvoiceLanguage,
  {
    invoiceTitle: string;
    invoiceNo: string;
    date: string;
    customer: string;
    phone: string;
    trn: string;
    description: string;
    qty: string;
    unitPrice: string;
    discount: string;
    amountAed: string;
    subtotal: string;
    inclVat: string;
    totalAed: string;
    amountPaid: string;
    change: string;
    footerComputerGenerated: string;
    footerVatLaw: string;
  }
> = {
  en: {
    invoiceTitle: "TAX INVOICE",
    invoiceNo: "Invoice No",
    date: "Date",
    customer: "Customer",
    phone: "Phone",
    trn: "Tax Registration Number (TRN)",
    description: "Description",
    qty: "Qty",
    unitPrice: "Unit Price",
    discount: "Discount",
    amountAed: "Amount (AED)",
    subtotal: "Subtotal (AED)",
    inclVat: "Incl. VAT",
    totalAed: "Total (AED)",
    amountPaid: "Amount Paid",
    change: "Change",
    footerComputerGenerated: "This is a computer-generated invoice.",
    footerVatLaw: "VAT applicable as per UAE VAT Law.",
  },
  ar: {
    invoiceTitle: "فاتورة ضريبية",
    invoiceNo: "رقم الفاتورة",
    date: "التاريخ",
    customer: "العميل",
    phone: "الهاتف",
    trn: "رقم التسجيل الضريبي (TRN)",
    description: "الوصف",
    qty: "الكمية",
    unitPrice: "سعر الوحدة",
    discount: "الخصم",
    amountAed: "المبلغ (درهم)",
    subtotal: "المجموع الفرعي (درهم)",
    inclVat: "شامل الضريبة",
    totalAed: "الإجمالي (درهم)",
    amountPaid: "المبلغ المدفوع",
    change: "الباقي",
    footerComputerGenerated: "هذه فاتورة صادرة إلكترونياً.",
    footerVatLaw: "الضريبة وفقاً لقانون ضريبة القيمة المضافة في الإمارات.",
  },
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  pageRtl: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    direction: "rtl",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingBottom: 10,
  },
  shopName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingVertical: 6,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    paddingVertical: 6,
    fontWeight: "bold",
  },
  col1: { width: "40%" },
  col2: { width: "15%", textAlign: "right" },
  col3: { width: "15%", textAlign: "right" },
  col4: { width: "15%", textAlign: "right" },
  col5: { width: "15%", textAlign: "right" },
  totals: {
    marginTop: 20,
    marginLeft: "auto",
    width: "40%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  grandTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#000",
    fontWeight: "bold",
    fontSize: 12,
  },
  footer: {
    marginTop: 30,
    fontSize: 8,
    color: "#666",
  },
});

type SaleItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imei?: string;
};

type A4InvoiceDocProps = {
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
  payments: { methodName: string; amount: number }[];
  channel: "VAT" | "NON_VAT";
  language?: A4InvoiceLanguage;
};

function A4InvoiceDocument({
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
  language = "en",
}: A4InvoiceDocProps) {
  const L = A4_INVOICE_LABELS[language];
  const isRtl = language === "ar";
  const pageStyle = isRtl ? styles.pageRtl : styles.page;
  const dateStr = new Date(saleDate).toLocaleDateString(isRtl ? "ar-AE" : "en-AE");

  return (
    <Document>
      <Page size="A4" style={pageStyle}>
        <View style={styles.header}>
          <Text style={styles.shopName}>{shopName}</Text>
          {shopAddress && <Text style={styles.row}>{shopAddress}</Text>}
          {shopPhone && <Text style={styles.row}>{shopPhone}</Text>}
          {channel === "VAT" && trnNumber && (
            <Text style={styles.row}>{L.trn}: {trnNumber}</Text>
          )}
        </View>

        <Text style={styles.invoiceTitle}>{L.invoiceTitle}</Text>
        <View style={styles.row}>
          <Text>{L.invoiceNo}: {invoiceNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text>{L.date}: {dateStr}</Text>
        </View>
        {(customerName || customerPhone) && (
          <View style={{ marginTop: 8 }}>
            <Text>{L.customer}: {customerName || "-"}</Text>
            {customerPhone && <Text>{L.phone}: {customerPhone}</Text>}
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>{L.description}</Text>
            <Text style={styles.col2}>{L.qty}</Text>
            <Text style={styles.col3}>{L.unitPrice}</Text>
            <Text style={styles.col4}>{L.discount}</Text>
            <Text style={styles.col5}>{L.amountAed}</Text>
          </View>
          {items.map((item, i) => {
            const qty = Number(item.quantity) || 0;
            const up = Number(item.unitPrice) || 0;
            const tot = Number(item.totalPrice) || 0;
            const discount = Math.max(0, qty * up - tot);
            return (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.col1}>
                  {String(item.productName ?? "")} {item.imei ? `- IMEI: ${item.imei}` : ""}
                </Text>
                <Text style={styles.col2}>{qty}</Text>
                <Text style={styles.col3}>{up.toFixed(2)}</Text>
                <Text style={styles.col4}>{discount.toFixed(2)}</Text>
                <Text style={styles.col5}>{tot.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>{L.subtotal}</Text>
            <Text>{subtotal.toFixed(2)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>{L.discount}</Text>
              <Text>-{discountAmount.toFixed(2)}</Text>
            </View>
          )}
          {channel === "VAT" && vatAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>{L.inclVat} ({vatRate}%)</Text>
              <Text>{vatAmount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text>{L.totalAed}</Text>
            <Text>{grandTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>{L.amountPaid}</Text>
            <Text>{paidAmount.toFixed(2)}</Text>
          </View>
          {changeAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>{L.change}</Text>
              <Text>{changeAmount.toFixed(2)}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text>{L.footerComputerGenerated}</Text>
          {channel === "VAT" && trnNumber && (
            <Text>TRN: {trnNumber} - {L.footerVatLaw}</Text>
          )}
        </View>
      </Page>
    </Document>
  );
}

export type A4InvoiceOptions = { language?: A4InvoiceLanguage };

function normalizeA4Props(props: A4InvoiceDocProps, options?: A4InvoiceOptions): A4InvoiceDocProps {
  const items = Array.isArray(props.items) ? props.items : [];
  const payments = Array.isArray(props.payments) ? props.payments : [];
  const language = options?.language ?? props.language ?? "en";
  return {
    shopName: props.shopName ?? "Shop",
    shopAddress: props.shopAddress ?? "",
    shopPhone: props.shopPhone ?? "",
    trnNumber: props.trnNumber ?? "",
    invoiceNumber: props.invoiceNumber ?? "",
    saleDate: props.saleDate ?? new Date().toISOString(),
    customerName: props.customerName ?? "",
    customerPhone: props.customerPhone ?? "",
    items: items.map((item) => ({
      productName: item?.productName ?? "",
      quantity: Number(item?.quantity) || 0,
      unitPrice: Number(item?.unitPrice) || 0,
      totalPrice: Number(item?.totalPrice) || 0,
      imei: item?.imei ?? "",
    })),
    subtotal: Number(props.subtotal) || 0,
    discountAmount: Number(props.discountAmount) || 0,
    vatRate: Number(props.vatRate) || 0,
    vatAmount: Number(props.vatAmount) || 0,
    grandTotal: Number(props.grandTotal) || 0,
    paidAmount: Number(props.paidAmount) || 0,
    changeAmount: Number(props.changeAmount) || 0,
    payments: payments.map((p) => ({
      methodName: p?.methodName ?? "",
      amount: Number(p?.amount) || 0,
    })),
    channel: props.channel === "NON_VAT" ? "NON_VAT" : "VAT",
    language,
  };
}

async function generateA4PdfBlob(props: A4InvoiceDocProps, options?: A4InvoiceOptions): Promise<Blob> {
  const pdfFn = pdf;
  if (typeof pdfFn !== "function") {
    throw new Error("PDF renderer is not available. Ensure @react-pdf/renderer is loaded for the browser.");
  }
  const safe = normalizeA4Props(props, options);
  const instance = pdfFn(<A4InvoiceDocument {...safe} />);
  if (!instance?.toBlob) {
    throw new Error("PDF instance did not return toBlob. Try updating @react-pdf/renderer.");
  }
  return instance.toBlob();
}

export async function downloadA4InvoicePdf(
  props: A4InvoiceDocProps,
  options?: A4InvoiceOptions
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("A4 invoice download is only available in the browser.");
  }
  const safe = normalizeA4Props(props, options);
  const blob = await generateA4PdfBlob(props, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice-${safe.invoiceNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function printA4InvoicePdf(
  props: A4InvoiceDocProps,
  options?: A4InvoiceOptions
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("A4 invoice print is only available in the browser.");
  }
  const blob = await generateA4PdfBlob(props, options);
  const url = URL.createObjectURL(blob);
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    URL.revokeObjectURL(url);
    throw new Error("Popup blocked. Allow popups to print the invoice.");
  }
  const html = `<!DOCTYPE html><html><head><title>Invoice</title></head><body style="margin:0;"><iframe src="${url}" style="width:100%;height:100vh;border:none;" title="Invoice PDF"></iframe></body></html>`;
  printWindow.document.write(html);
  printWindow.document.close();
  const iframe = printWindow.document.querySelector("iframe");
  const doPrint = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => {
      URL.revokeObjectURL(url);
      printWindow.close();
    };
  };
  if (iframe) {
    iframe.onload = () => setTimeout(doPrint, 100);
  } else {
    setTimeout(doPrint, 300);
  }
}

export { A4InvoiceDocument };
