import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Shift } from "@/models/Shift";
import { Sale } from "@/models/Sale";
import { ReturnModel } from "@/models/Return";
import { resolveAccessibleBranchId } from "@/lib/branches";

async function calculateShiftTotals(shopId: string, branchId: mongoose.Types.ObjectId, openedAt: Date, closedAt = new Date()) {
  const shopObjectId = new mongoose.Types.ObjectId(String(shopId));
  const sales = await Sale.find({
    shopId,
    branchId,
    status: { $in: ["COMPLETED", "PARTIALLY_RETURNED"] },
    saleDate: { $gte: openedAt, $lte: closedAt },
  }).select("payments").lean();

  const paymentTotals: Record<string, number> = {};
  let cashSales = 0;
  for (const sale of sales as unknown as { payments?: { methodName?: string; methodType?: string; amount?: number }[] }[]) {
    for (const payment of sale.payments ?? []) {
      const key = payment.methodType || payment.methodName || "OTHER";
      const amount = Number(payment.amount) || 0;
      paymentTotals[key] = (paymentTotals[key] ?? 0) + amount;
      if (payment.methodType === "CASH" || /cash/i.test(payment.methodName ?? "")) cashSales += amount;
    }
  }

  const refunds = await ReturnModel.aggregate([
    {
      $match: {
        shopId: shopObjectId,
        branchId,
        status: "COMPLETED",
        returnDate: { $gte: openedAt, $lte: closedAt },
        refundMethod: { $regex: /cash/i },
      },
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  const cashRefunds = refunds[0]?.total ?? 0;
  return { paymentTotals, cashSales, cashRefunds, expectedCash: cashSales - cashRefunds };
}

export async function GET(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  await connectDB();
  const branchParam = request.nextUrl.searchParams.get("branchId");
  const branchId = await resolveAccessibleBranchId(shopId!, branchParam, session!.user.branchId);
  const active = await Shift.findOne({ shopId, branchId, status: "OPEN" })
    .populate("openedBy", "name")
    .lean();
  const history = await Shift.find({ shopId, branchId, status: "CLOSED" })
    .populate("openedBy", "name")
    .populate("closedBy", "name")
    .sort({ closedAt: -1 })
    .limit(50)
    .lean();
  return Response.json({ active, history });
}

export async function POST(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json();
  const { action, branchId: bodyBranchId } = body;
  await connectDB();
  const branchId = await resolveAccessibleBranchId(shopId!, bodyBranchId, session!.user.branchId);

  if (action === "open") {
    const existing = await Shift.findOne({ shopId, branchId, status: "OPEN" });
    if (existing) return Response.json({ error: "A shift is already open for this branch" }, { status: 400 });
    const shift = await Shift.create({
      shopId,
      branchId,
      openedBy: session!.user.id,
      openingCash: Number(body.openingCash) || 0,
      notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
    });
    return Response.json(shift);
  }

  if (action === "close") {
    const shift = await Shift.findOne({ shopId, branchId, status: "OPEN" });
    if (!shift) return Response.json({ error: "No open shift for this branch" }, { status: 400 });
    const countedCash = Number(body.countedCash) || 0;
    const closedAt = new Date();
    const totals = await calculateShiftTotals(shopId!, branchId, shift.openedAt, closedAt);
    const expectedCash = (Number(shift.openingCash) || 0) + totals.expectedCash;
    shift.countedCash = countedCash;
    shift.cashSales = totals.cashSales;
    shift.cashRefunds = totals.cashRefunds;
    shift.expectedCash = expectedCash;
    shift.variance = countedCash - expectedCash;
    shift.paymentTotals = totals.paymentTotals;
    shift.status = "CLOSED";
    shift.closedAt = closedAt;
    shift.closedBy = session!.user.id;
    if (typeof body.notes === "string" && body.notes.trim()) shift.notes = body.notes.trim();
    await shift.save();
    return Response.json(shift);
  }

  return Response.json({ error: "Invalid shift action" }, { status: 400 });
}
