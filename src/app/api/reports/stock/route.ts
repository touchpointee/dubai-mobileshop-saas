import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Product } from "@/models/Product";
import { ProductImei } from "@/models/ProductImei";

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

  await connectDB();

  // Shared stock - one list for all products in the shop
  const list = await Product.find({ shopId, isActive: true })
    .sort({ name: 1 })
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
