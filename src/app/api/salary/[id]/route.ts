import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { StaffSalary } from "@/models/StaffSalary";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  const body = await request.json();
  const { paidAmount, status, paidDate, notes } = body;
  await connectDB();
  const salary = await StaffSalary.findOne({ _id: id, shopId });
  if (!salary) return Response.json({ error: "Not found" }, { status: 404 });
  if (typeof paidAmount === "number") salary.paidAmount = paidAmount;
  if (status === "PENDING" || status === "PARTIAL" || status === "PAID") salary.status = status;
  if (paidDate !== undefined) salary.paidDate = paidDate ? new Date(paidDate) : null;
  if (notes !== undefined) salary.notes = notes?.trim();
  await salary.save();
  return Response.json(salary);
}
