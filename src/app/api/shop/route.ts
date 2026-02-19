import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Shop } from "@/models/Shop";

export async function GET() {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  await connectDB();
  const shop = await Shop.findById(shopId).select("name nameAr vatRate currency trnNumber").lean();
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });
  return Response.json(shop);
}
