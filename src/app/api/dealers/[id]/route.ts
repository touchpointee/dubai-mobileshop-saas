import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Dealer } from "@/models/Dealer";

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
  const dealer = await Dealer.findOne({ _id: id, shopId }).lean();
  if (!dealer) return Response.json({ error: "Dealer not found" }, { status: 404 });
  return Response.json(dealer);
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
  const { name, phone, email, company, address, trnNumber, isActive } = body;
  await connectDB();
  const dealer = await Dealer.findOne({ _id: id, shopId });
  if (!dealer) return Response.json({ error: "Dealer not found" }, { status: 404 });
  if (name !== undefined) dealer.name = String(name).trim();
  if (phone !== undefined) dealer.phone = phone ? String(phone).trim() : undefined;
  if (email !== undefined) dealer.email = email ? String(email).trim() : undefined;
  if (company !== undefined) dealer.company = company ? String(company).trim() : undefined;
  if (address !== undefined) dealer.address = address ? String(address).trim() : undefined;
  if (trnNumber !== undefined) dealer.trnNumber = trnNumber ? String(trnNumber).trim() : undefined;
  if (typeof isActive === "boolean") dealer.isActive = isActive;
  await dealer.save();
  return Response.json(dealer);
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
  const dealer = await Dealer.findOne({ _id: id, shopId });
  if (!dealer) return Response.json({ error: "Dealer not found" }, { status: 404 });
  dealer.isActive = false;
  await dealer.save();
  return Response.json({ success: true });
}
