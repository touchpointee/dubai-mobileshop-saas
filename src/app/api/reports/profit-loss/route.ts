import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Sale } from "@/models/Sale";
import { Expense } from "@/models/Expense";

export async function GET(request: NextRequest) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  await connectDB();

  const dateMatch: Record<string, unknown> = {};
  if (from) dateMatch.$gte = new Date(from);
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    dateMatch.$lte = toDate;
  }

  const saleMatch: Record<string, unknown> = { shopId, status: "COMPLETED" };
  if (Object.keys(dateMatch).length) saleMatch.saleDate = dateMatch;
  const expenseMatch: Record<string, unknown> = { shopId };
  if (Object.keys(dateMatch).length) expenseMatch.date = dateMatch;

  const [salesAgg, expenseAgg] = await Promise.all([
    Sale.aggregate([
      { $match: saleMatch },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$grandTotal" },
          vatCollected: { $sum: "$vatAmount" },
          count: { $sum: 1 },
        },
      },
    ]),
    Expense.aggregate([
      { $match: expenseMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const revenue = salesAgg[0]?.revenue ?? 0;
  const expenses = expenseAgg[0]?.total ?? 0;
  const vatCollected = salesAgg[0]?.vatCollected ?? 0;

  return Response.json({
    revenue,
    vatCollected,
    expenses,
    grossProfit: revenue - expenses,
    note: "Revenue includes all sales. Cost of goods is not deducted here; use inventory reports for COGS.",
  });
}
