import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Dealer } from "@/models/Dealer";
import { DealerPayment } from "@/models/DealerPayment";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid dealer ID" }, { status: 400 });
  }
  await connectDB();
  const dealer = await Dealer.findOne({ _id: id, shopId }).lean();
  if (!dealer) return Response.json({ error: "Dealer not found" }, { status: 404 });
  const payments = await DealerPayment.find({ dealerId: id, shopId })
    .sort({ paymentDate: -1 })
    .limit(100)
    .lean();
  return Response.json(payments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid dealer ID" }, { status: 400 });
  }
  const body = await request.json();
  const { amount, notes } = body;
  const payAmount = Number(amount);
  if (!(payAmount > 0)) {
    return Response.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }
  await connectDB();
  const dealer = await Dealer.findOne({ _id: id, shopId });
  if (!dealer) return Response.json({ error: "Dealer not found" }, { status: 404 });
  const currentBalance = dealer.balance ?? 0;
  const deduct = Math.min(payAmount, currentBalance);
  if (deduct <= 0) {
    return Response.json({ error: "Dealer balance is zero or negative. Nothing to pay." }, { status: 400 });
  }
  await DealerPayment.create({
    shopId,
    dealerId: id,
    amount: deduct,
    paymentDate: new Date(),
    notes: notes?.trim(),
    createdBy: session!.user.id,
  });
  dealer.balance = currentBalance - deduct;
  await dealer.save();
  return Response.json({ payment: { amount: deduct }, dealer: dealer.toObject() });
}
