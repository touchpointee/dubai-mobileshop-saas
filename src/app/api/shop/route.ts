import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Shop } from "@/models/Shop";

export async function GET() {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  await connectDB();
  const shop = await Shop.findById(shopId).select("name nameAr vatRate currency trnNumber costCodeMap costFalseCode").lean();
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });
  return Response.json(shop);
}

export async function PUT(request: Request) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json().catch(() => ({}));
  const { name, costCodeMap, costFalseCode } = body ?? {};

  await connectDB();
  const shop = await Shop.findById(shopId);
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

  if (typeof name === "string" && name.trim()) {
    shop.name = name.trim();
  }

  if (costCodeMap && typeof costCodeMap === "object") {
    const next: Record<string, string> = {};
    for (const digit of ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]) {
      const raw = typeof costCodeMap[digit] === "string" ? String(costCodeMap[digit]) : "";
      const trimmed = raw.trim();
      if (trimmed) next[digit] = trimmed[0];
    }
    shop.costCodeMap = Object.keys(next).length > 0 ? next : undefined;
  }

  if (typeof costFalseCode === "string") {
    const trimmed = costFalseCode.trim();
    shop.costFalseCode = trimmed ? trimmed[0] : undefined;
  }

  await shop.save();
  return Response.json({
    _id: shop._id,
    name: shop.name,
    nameAr: shop.nameAr,
    vatRate: shop.vatRate,
    currency: shop.currency,
    trnNumber: shop.trnNumber,
    costCodeMap: shop.costCodeMap,
    costFalseCode: shop.costFalseCode,
  });
}
