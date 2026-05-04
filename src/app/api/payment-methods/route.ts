import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { PaymentMethod } from "@/models/PaymentMethod";

const METHOD_TYPES = ["CASH", "CARD", "BNPL", "BANK_TRANSFER", "WALLET", "TRADE_IN", "OTHER"] as const;

function normalizeType(value: unknown) {
  return METHOD_TYPES.includes(value as (typeof METHOD_TYPES)[number]) ? value : "OTHER";
}

export async function GET() {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  await connectDB();
  const list = await PaymentMethod.find({ shopId }).sort({ createdAt: 1 }).lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json();
  const { name, nameAr, type, provider, requiresReference, isCashDrawer } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  await connectDB();
  const pm = await PaymentMethod.create({
    shopId,
    name: name.trim(),
    nameAr: nameAr?.trim() || undefined,
    type: normalizeType(type),
    provider: typeof provider === "string" && provider.trim() ? provider.trim() : undefined,
    requiresReference: Boolean(requiresReference),
    isCashDrawer: Boolean(isCashDrawer),
    isActive: true,
  });
  return Response.json(pm);
}
