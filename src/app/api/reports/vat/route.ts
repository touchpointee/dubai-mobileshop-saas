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

  const match: Record<string, unknown> = { shopId, channel: "VAT", status: "COMPLETED" };
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

  const [summary, list] = await Promise.all([
    Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalVatable: { $sum: "$vatableAmount" },
          totalVat: { $sum: "$vatAmount" },
          totalSales: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
    ]),
    Sale.find(match)
      .select("invoiceNumber saleDate vatableAmount vatAmount grandTotal")
      .sort({ saleDate: -1 })
      .limit(300)
      .lean(),
  ]);

  return Response.json({
    summary: {
      totalVatable: summary[0]?.totalVatable ?? 0,
      totalVat: summary[0]?.totalVat ?? 0,
      totalSales: summary[0]?.totalSales ?? 0,
      count: summary[0]?.count ?? 0,
    },
    list,
  });
}
