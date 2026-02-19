import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { StaffSalary } from "@/models/StaffSalary";
import { User } from "@/models/User";

export async function GET(request: NextRequest) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const month = request.nextUrl.searchParams.get("month");
  const year = request.nextUrl.searchParams.get("year");
  await connectDB();
  const match: Record<string, unknown> = { shopId };
  if (month) match.month = Number(month);
  if (year) match.year = Number(year);
  const list = await StaffSalary.find(match)
    .populate("userId", "name email")
    .sort({ year: -1, month: -1 })
    .limit(100)
    .lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json();
  const { userId, month, year, basicSalary, bonus, deductions, notes } = body;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId) || typeof month !== "number" || typeof year !== "number") {
    return Response.json({ error: "User, month and year are required" }, { status: 400 });
  }
  const basic = Number(basicSalary) || 0;
  const b = Number(bonus) || 0;
  const d = Number(deductions) || 0;
  const net = basic + b - d;
  await connectDB();
  const existing = await StaffSalary.findOne({ shopId, userId, month, year });
  if (existing) {
    return Response.json({ error: "Salary record already exists for this month" }, { status: 400 });
  }
  const salary = await StaffSalary.create({
    shopId,
    userId,
    month,
    year,
    basicSalary: basic,
    bonus: b,
    deductions: d,
    netSalary: net,
    paidAmount: 0,
    status: "PENDING",
    notes: notes?.trim(),
  });
  return Response.json(salary);
}
