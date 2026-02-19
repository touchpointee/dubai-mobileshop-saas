import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { PaymentMethod } from "@/models/PaymentMethod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  await connectDB();
  const pm = await PaymentMethod.findOne({ _id: id, shopId }).lean();
  if (!pm) return Response.json({ error: "Payment method not found" }, { status: 404 });
  return Response.json(pm);
}

export async function PUT(
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
  const { name, nameAr, isActive } = body;
  await connectDB();
  const pm = await PaymentMethod.findOne({ _id: id, shopId });
  if (!pm) return Response.json({ error: "Payment method not found" }, { status: 404 });
  if (name !== undefined) pm.name = String(name).trim();
  if (nameAr !== undefined) pm.nameAr = nameAr ? String(nameAr).trim() : undefined;
  if (typeof isActive === "boolean") pm.isActive = isActive;
  await pm.save();
  return Response.json(pm);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  await connectDB();
  const pm = await PaymentMethod.findOne({ _id: id, shopId });
  if (!pm) return Response.json({ error: "Payment method not found" }, { status: 404 });
  await PaymentMethod.deleteOne({ _id: id, shopId });
  return Response.json({ success: true });
}
