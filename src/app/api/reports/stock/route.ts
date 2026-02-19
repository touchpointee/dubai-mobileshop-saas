import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Product } from "@/models/Product";
import { ProductImei } from "@/models/ProductImei";
import type { Channel } from "@/lib/constants";

type StockRow = {
  _id: unknown;
  name: string;
  brand?: string;
  category?: string;
  channel: string;
  quantity: number;
  requiresImei?: boolean;
  imeiCount?: number;
  costPrice: number;
  sellPrice: number;
};

function getStockQty(p: StockRow): number {
  return p.requiresImei ? (p.imeiCount ?? 0) : (p.quantity ?? 0);
}

export async function GET(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;

  let channelParam = request.nextUrl.searchParams.get("channel");
  const role = session!.user.role;
  if (role === "VAT_STAFF") channelParam = "VAT";
  else if (role === "NON_VAT_STAFF") channelParam = "NON_VAT";
  const channel: "VAT" | "NON_VAT" | "ALL" =
    channelParam === "NON_VAT" || channelParam === "ALL" ? channelParam : "VAT";

  await connectDB();

  const channelFilter: Record<string, unknown> =
    channel === "ALL"
      ? { shopId, channel: { $in: ["VAT", "NON_VAT"] }, isActive: true }
      : { shopId, channel, isActive: true };

  const list = await Product.find(channelFilter)
    .sort({ channel: 1, name: 1 })
    .lean();

  const products = list as unknown as (StockRow & { _id: { toString(): string } })[];

  const requireImeiIds = products
    .filter((p) => p.requiresImei)
    .map((p) => p._id);

  if (requireImeiIds.length > 0) {
    const counts = await ProductImei.aggregate([
      { $match: { productId: { $in: requireImeiIds }, status: "IN_STOCK" } },
      { $group: { _id: "$productId", count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    for (const c of counts) countMap[c._id.toString()] = c.count;
    for (const p of products) {
      if (p.requiresImei) p.imeiCount = countMap[p._id.toString()] ?? 0;
    }
  }

  let totalQuantity = 0;
  let totalValue = 0;
  for (const p of products) {
    const qty = getStockQty(p);
    totalQuantity += qty;
    totalValue += (p.costPrice ?? 0) * qty;
  }

  return Response.json({
    products,
    summary: {
      totalProducts: products.length,
      totalQuantity,
      totalValue,
    },
  });
}
