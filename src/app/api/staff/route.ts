import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Staff } from "@/models/Staff";
import { StaffSalaryPayment } from "@/models/StaffSalaryPayment";

export async function GET(request: NextRequest) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const shopObjectId = new mongoose.Types.ObjectId(String(shopId));
  const activeOnly = request.nextUrl.searchParams.get("activeOnly");
  await connectDB();
  const match: Record<string, unknown> = { shopId };
  if (activeOnly === "true") match.isActive = true;
  const list = await Staff.find(match)
    .sort({ name: 1 })
    .select("_id name phone isActive")
    .lean();
  type StaffLean = { _id: { toString(): string }; name: string; phone?: string; isActive: boolean };
  const listTyped = list as unknown as StaffLean[];
  const staffIds = listTyped.map((s) => s._id);
  const totals = await StaffSalaryPayment.aggregate([
    { $match: { shopId: shopObjectId, staffId: { $in: staffIds } } },
    { $group: { _id: "$staffId", total: { $sum: "$amount" } } },
  ]);
  const totalByStaff: Record<string, number> = {};
  (totals as { _id: unknown; total: number }[]).forEach((t) => {
    totalByStaff[String(t._id)] = t.total;
  });
  const listWithTotal = listTyped.map((s) => ({
    _id: s._id,
    name: s.name,
    phone: s.phone,
    isActive: s.isActive,
    totalPaid: totalByStaff[s._id.toString()] ?? 0,
  }));
  return Response.json(listWithTotal);
}

export async function POST(request: NextRequest) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json();
  const { name, phone } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  await connectDB();
  const staff = await Staff.create({
    shopId,
    name: name.trim(),
    phone: phone?.trim() || undefined,
    isActive: true,
  });
  return Response.json(staff);
}
