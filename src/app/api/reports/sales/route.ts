import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Sale } from "@/models/Sale";

export async function GET(request: NextRequest) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  await connectDB();

  const match: Record<string, unknown> = { shopId, status: "COMPLETED", channel: "VAT" };
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
    { $match: match },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$grandTotal" },
        totalVat: { $sum: "$vatAmount" },
        count: { $sum: 1 },
      },
    },
  ]);

  return Response.json({
    sales: list,
    totalSales: summary[0]?.totalSales ?? 0,
    vatCollected: summary[0]?.totalVat ?? 0,
    invoiceCount: summary[0]?.count ?? 0,
  });
}
