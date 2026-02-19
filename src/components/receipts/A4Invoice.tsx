"use client";

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
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
}: A4InvoiceDocProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.shopName}>{shopName}</Text>
          {shopAddress && <Text style={styles.row}>{shopAddress}</Text>}
          {shopPhone && <Text style={styles.row}>{shopPhone}</Text>}
          {channel === "VAT" && trnNumber && (
            <Text style={styles.row}>Tax Registration Number (TRN): {trnNumber}</Text>
          )}
        </View>

        <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
        <View style={styles.row}>
          <Text>Invoice No: {invoiceNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text>Date: {new Date(saleDate).toLocaleDateString("en-AE")}</Text>
        </View>
        {(customerName || customerPhone) && (
          <View style={{ marginTop: 8 }}>
            <Text>Customer: {customerName || "-"}</Text>
            {customerPhone && <Text>Phone: {customerPhone}</Text>}
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.col1}>Description</Text>
            <Text style={styles.col2}>Qty</Text>
            <Text style={styles.col3}>Unit Price</Text>
            <Text style={styles.col4}>Discount</Text>
            <Text style={styles.col5}>Amount (AED)</Text>
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
            <Text>Subtotal (AED)</Text>
            <Text>{subtotal.toFixed(2)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>Discount</Text>
              <Text>-{discountAmount.toFixed(2)}</Text>
            </View>
          )}
          {channel === "VAT" && vatAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>VAT ({vatRate}%)</Text>
              <Text>{vatAmount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text>Total (AED)</Text>
            <Text>{grandTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Amount Paid</Text>
            <Text>{paidAmount.toFixed(2)}</Text>
          </View>
          {changeAmount > 0 && (
            <View style={styles.totalRow}>
              <Text>Change</Text>
              <Text>{changeAmount.toFixed(2)}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text>This is a computer-generated invoice.</Text>
          {channel === "VAT" && trnNumber && (
            <Text>TRN: {trnNumber} - VAT applicable as per UAE VAT Law.</Text>
          )}
        </View>
      </Page>
    </Document>
  );
}

function normalizeA4Props(props: A4InvoiceDocProps): A4InvoiceDocProps {
  const items = Array.isArray(props.items) ? props.items : [];
  const payments = Array.isArray(props.payments) ? props.payments : [];
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
  };
}

export async function downloadA4InvoicePdf(props: A4InvoiceDocProps): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("A4 invoice download is only available in the browser.");
  }
  const pdfFn = pdf;
  if (typeof pdfFn !== "function") {
    throw new Error("PDF renderer is not available. Ensure @react-pdf/renderer is loaded for the browser.");
  }
  const safe = normalizeA4Props(props);
  const instance = pdfFn(<A4InvoiceDocument {...safe} />);
  if (!instance?.toBlob) {
    throw new Error("PDF instance did not return toBlob. Try updating @react-pdf/renderer.");
  }
  const blob = await instance.toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Invoice-${safe.invoiceNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export { A4InvoiceDocument };
