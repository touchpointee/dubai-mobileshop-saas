import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Customer } from "@/models/Customer";

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
  const customer = await Customer.findOne({ _id: id, shopId }).lean();
  if (!customer) return Response.json({ error: "Customer not found" }, { status: 404 });
  return Response.json(customer);
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
  const { name, phone, email, address, isActive } = body;
  await connectDB();
  const customer = await Customer.findOne({ _id: id, shopId });
  if (!customer) return Response.json({ error: "Customer not found" }, { status: 404 });
  if (name !== undefined) customer.name = String(name).trim();
  if (phone !== undefined) customer.phone = phone ? String(phone).trim() : undefined;
  if (email !== undefined) customer.email = email ? String(email).trim() : undefined;
  if (address !== undefined) customer.address = address ? String(address).trim() : undefined;
  if (typeof isActive === "boolean") customer.isActive = isActive;
  await customer.save();
  return Response.json(customer);
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
  const customer = await Customer.findOne({ _id: id, shopId });
  if (!customer) return Response.json({ error: "Customer not found" }, { status: 404 });
  customer.isActive = false;
  await customer.save();
  return Response.json({ success: true });
}
