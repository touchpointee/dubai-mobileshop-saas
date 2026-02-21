import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Staff } from "@/models/Staff";

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
  const staff = await Staff.findOne({ _id: id, shopId })
    .select("_id name phone isActive")
    .lean();
  if (!staff) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(staff);
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
  const { name, phone, isActive } = body;
  await connectDB();
  const staff = await Staff.findOne({ _id: id, shopId });
  if (!staff) return Response.json({ error: "Not found" }, { status: 404 });
  if (typeof name === "string" && name.trim()) staff.name = name.trim();
  if (phone !== undefined) staff.phone = phone?.trim() || undefined;
  if (typeof isActive === "boolean") staff.isActive = isActive;
  await staff.save();
  return Response.json(staff);
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
  const staff = await Staff.findOne({ _id: id, shopId });
  if (!staff) return Response.json({ error: "Not found" }, { status: 404 });
  staff.isActive = false;
  await staff.save();
  return Response.json({ ok: true });
}
