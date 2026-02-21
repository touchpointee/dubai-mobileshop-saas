import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Staff } from "@/models/Staff";
import { StaffSalaryPayment } from "@/models/StaffSalaryPayment";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  const fromDate = request.nextUrl.searchParams.get("fromDate");
  const toDate = request.nextUrl.searchParams.get("toDate");
  await connectDB();
  const staff = await Staff.findOne({ _id: id, shopId }).lean();
  if (!staff) return Response.json({ error: "Staff not found" }, { status: 404 });
  const match: Record<string, unknown> = { shopId, staffId: id };
  if (fromDate || toDate) {
    const dateRange: Record<string, Date> = {};
    if (fromDate) dateRange.$gte = new Date(fromDate);
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      dateRange.$lte = end;
    }
    match.paidDate = dateRange;
  }
  const list = await StaffSalaryPayment.find(match)
    .sort({ paidDate: -1 })
    .select("_id amount note paidDate")
    .lean();
  const totalPaid = list.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
  return Response.json({ payments: list, totalPaid });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  const body = await request.json();
  const { amount, note, paidDate } = body;
  if (typeof amount !== "number" || amount <= 0) {
    return Response.json({ error: "Valid amount is required" }, { status: 400 });
  }
  await connectDB();
  const staff = await Staff.findOne({ _id: id, shopId }).lean();
  if (!staff) return Response.json({ error: "Staff not found" }, { status: 404 });
  const payment = await StaffSalaryPayment.create({
    shopId,
    staffId: id,
    amount: Number(amount),
    note: note?.trim() || undefined,
    paidDate: paidDate ? new Date(paidDate) : new Date(),
  });
  return Response.json(payment);
}
