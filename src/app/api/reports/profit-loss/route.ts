import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Sale } from "@/models/Sale";
import { Expense } from "@/models/Expense";
import { getAccessibleBranchFilter } from "@/lib/branches";

export async function GET(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const branchParam = request.nextUrl.searchParams.get("branchId");
  await connectDB();
  const shopObjectId = new mongoose.Types.ObjectId(String(shopId));
  const branchId = await getAccessibleBranchFilter(shopId!, session!.user.branchId, branchParam);

  const dateMatch: Record<string, unknown> = {};
  if (from) dateMatch.$gte = new Date(from);
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    dateMatch.$lte = toDate;
  }

  const saleMatch: Record<string, unknown> = { shopId: shopObjectId, status: "COMPLETED" };
  if (branchId) saleMatch.branchId = branchId;
  if (Object.keys(dateMatch).length) saleMatch.saleDate = dateMatch;
  const expenseMatch: Record<string, unknown> = { shopId: shopObjectId };
  if (Object.keys(dateMatch).length) expenseMatch.date = dateMatch;

  const [salesAgg, cogsAgg, expenseAgg] = await Promise.all([
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
    Sale.aggregate([
      { $match: saleMatch },
      { $unwind: "$items" },
      {
        $group: {
          _id: null,
          cogs: {
            $sum: {
              $ifNull: [
                "$items.costAmount",
                { $ifNull: ["$items.marginCost", 0] },
              ],
            },
          },
        },
      },
    ]),
    Expense.aggregate([
      { $match: expenseMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const revenue = salesAgg[0]?.revenue ?? 0;
  const cogs = cogsAgg[0]?.cogs ?? 0;
  const expenses = expenseAgg[0]?.total ?? 0;
  const vatCollected = salesAgg[0]?.vatCollected ?? 0;

  return Response.json({
    revenue,
    vatCollected,
    cogs,
    expenses,
    grossProfit: revenue - cogs,
    netProfit: revenue - cogs - expenses,
    note: "Gross profit uses sale-line cost snapshots for new sales. Older sales without cost snapshots may understate COGS.",
  });
}
