import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Expense } from "@/models/Expense";

export async function GET(request: NextRequest) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  await connectDB();
  const match: Record<string, unknown> = { shopId };
  if (from || to) {
    const dateRange: Record<string, Date> = {};
    if (from) dateRange.$gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateRange.$lte = toDate;
    }
    match.date = dateRange;
  }
  const list = await Expense.find(match)
    .populate("categoryId", "name")
    .populate("createdBy", "name")
    .sort({ date: -1 })
    .limit(300)
    .lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json();
  const { categoryId, description, amount, date } = body;
  if (!categoryId || !description || typeof amount !== "number" || !date) {
    return Response.json({ error: "Category, description, amount and date are required" }, { status: 400 });
  }
  await connectDB();
  const expense = await Expense.create({
    shopId,
    categoryId,
    description: String(description).trim(),
    amount: Number(amount),
    date: new Date(date),
    createdBy: session!.user.id,
  });
  return Response.json(expense);
}
