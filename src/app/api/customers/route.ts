import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Customer } from "@/models/Customer";

export async function GET() {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  await connectDB();
  const list = await Customer.find({ shopId, isActive: true })
    .sort({ createdAt: -1 })
    .lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json();
  const { name, phone, email, address, emiratesId, passportNumber } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  await connectDB();
  const customer = await Customer.create({
    shopId,
    name: name.trim(),
    phone: phone?.trim() || undefined,
    email: email?.trim() || undefined,
    address: address?.trim() || undefined,
    emiratesId: emiratesId?.trim() || undefined,
    passportNumber: passportNumber?.trim() || undefined,
    isActive: true,
  });
  return Response.json(customer);
}
