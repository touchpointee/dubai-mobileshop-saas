import { NextRequest } from "next/server";
import mongoose from "mongoose";
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
  const shopObjectId = new mongoose.Types.ObjectId(String(shopId));

  const match: Record<string, unknown> = { shopId, status: "COMPLETED", channel: "VAT" };
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
    .populate("soldBy", "name")
    .sort({ saleDate: -1 })
    .limit(500)
    .lean();

  const summary = await Sale.aggregate([
    { $match: { ...match, shopId: shopObjectId } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$grandTotal" },
        totalVat: { $sum: "$vatAmount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const sales = list.map((sale) => {
    const s = sale as unknown as {
      _id: unknown;
      invoiceNumber?: string;
      saleDate?: Date;
      channel?: string;
      grandTotal?: number;
      soldBy?: { name?: string };
    };
    return {
      _id: String(s._id),
      invoiceNumber: s.invoiceNumber ?? "",
      date: s.saleDate,
      channel: s.channel ?? "VAT",
      total: s.grandTotal ?? 0,
      soldBy: s.soldBy,
    };
  });

  return Response.json({
    sales,
    totalSales: summary[0]?.totalSales ?? 0,
    vatCollected: summary[0]?.totalVat ?? 0,
    invoiceCount: summary[0]?.count ?? 0,
  });
}
