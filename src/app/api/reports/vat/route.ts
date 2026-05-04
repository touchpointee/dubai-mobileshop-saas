import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Sale } from "@/models/Sale";
import { resolveBranchId } from "@/lib/branches";

export async function GET(request: NextRequest) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const branchParam = request.nextUrl.searchParams.get("branchId");
  await connectDB();

  const match: Record<string, unknown> = { shopId, channel: "VAT", status: "COMPLETED" };
  if (branchParam) match.branchId = await resolveBranchId(shopId!, branchParam);
  if (from || to) {
    const dateRange: Record<string, Date> = {};
    if (from) dateRange.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateRange.$lte = toDate;
    }
    match.saleDate = dateRange;
  }

  const list = await Sale.find(match)
    .select("invoiceNumber saleDate vatableAmount vatAmount normalVatAmount marginSchemeVatAmount grandTotal hasMarginSchemeItems")
    .sort({ saleDate: -1 })
    .limit(300)
    .lean();

  type SaleRow = {
    _id: unknown;
    invoiceNumber: string;
    saleDate: Date;
    vatableAmount?: number;
    vatAmount?: number;
    normalVatAmount?: number;
    marginSchemeVatAmount?: number;
    grandTotal?: number;
    hasMarginSchemeItems?: boolean;
  };
  const rows = (list as unknown as SaleRow[]).map((s) => ({
    _id: s._id,
    invoiceNumber: s.invoiceNumber,
    date: s.saleDate,
    vatableAmount: s.vatableAmount ?? ((s.grandTotal ?? 0) - (s.vatAmount ?? 0)),
    vatAmount: s.vatAmount ?? 0,
    normalVatAmount: s.normalVatAmount ?? (s.hasMarginSchemeItems ? 0 : (s.vatAmount ?? 0)),
    marginSchemeVatAmount: s.marginSchemeVatAmount ?? (s.hasMarginSchemeItems ? (s.vatAmount ?? 0) : 0),
    hasMarginSchemeItems: Boolean(s.hasMarginSchemeItems),
    total: s.grandTotal ?? 0,
  }));

  const totalVatable = rows.reduce((sum, r) => sum + r.vatableAmount, 0);
  const totalVat = rows.reduce((sum, r) => sum + r.vatAmount, 0);
  const totalNormalVat = rows.reduce((sum, r) => sum + r.normalVatAmount, 0);
  const totalMarginSchemeVat = rows.reduce((sum, r) => sum + r.marginSchemeVatAmount, 0);
  const marginSchemeInvoiceCount = rows.filter((r) => r.hasMarginSchemeItems).length;
  const totalSales = rows.reduce((sum, r) => sum + r.total, 0);

  return Response.json({
    rows,
    totalVatable,
    totalVat,
    totalNormalVat,
    totalMarginSchemeVat,
    totalSales,
    marginSchemeInvoiceCount,
    invoiceCount: rows.length,
  });
}
