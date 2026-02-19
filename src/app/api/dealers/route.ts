import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Dealer } from "@/models/Dealer";

export async function GET() {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  await connectDB();
  const list = await Dealer.find({ shopId, isActive: true })
    .sort({ createdAt: -1 })
    .lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json();
  const { name, phone, email, company, address, trnNumber } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  await connectDB();
  const dealer = await Dealer.create({
    shopId,
    name: name.trim(),
    phone: phone?.trim() || undefined,
    email: email?.trim() || undefined,
    company: company?.trim() || undefined,
    address: address?.trim() || undefined,
    trnNumber: trnNumber?.trim() || undefined,
    balance: 0,
    isActive: true,
  });
  return Response.json(dealer);
}
