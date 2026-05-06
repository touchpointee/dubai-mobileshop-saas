import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Product } from "@/models/Product";
import { ProductImei } from "@/models/ProductImei";
import { ProductBatch } from "@/models/ProductBatch";
import { getAccessibleBranchFilter } from "@/lib/branches";

type StockRow = {
  _id: unknown;
  name: string;
  brand?: string;
  category?: string;
  channel: string;
  quantity: number;
  requiresImei?: boolean;
  imeiCount?: number;
  aged30Count?: number;
  aged60Count?: number;
  oldestStockAgeDays?: number;
  costPrice: number;
  sellPrice: number;
  createdAt?: Date;
  trackByBatch?: boolean;
};

function getStockQty(p: StockRow): number {
  return p.requiresImei ? (p.imeiCount ?? p.quantity ?? 0) : (p.quantity ?? 0);
}

export async function GET(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;

  await connectDB();
  const shopObjectId = new mongoose.Types.ObjectId(String(shopId));
  const branchParam = request.nextUrl.searchParams.get("branchId");
  const branchId = await getAccessibleBranchFilter(shopId!, session!.user.branchId, branchParam);

  // VAT-only: stock report shows only VAT channel products
  const list = await Product.find({ shopId, isActive: true, channel: "VAT" })
    .sort({ name: 1 })
    .lean();

  const products = list as unknown as (StockRow & { _id: { toString(): string } })[];
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const aged30Cutoff = new Date(now - 30 * oneDayMs);
  const aged60Cutoff = new Date(now - 60 * oneDayMs);

  const requireImeiIds = products
    .filter((p) => p.requiresImei)
    .map((p) => p._id);

  if (requireImeiIds.length > 0) {
    const counts = await ProductImei.aggregate([
      { $match: { shopId: shopObjectId, productId: { $in: requireImeiIds }, status: "IN_STOCK", ...(branchId ? { branchId } : {}) } },
      {
        $group: {
          _id: "$productId",
          count: { $sum: 1 },
          aged30Count: { $sum: { $cond: [{ $lte: ["$createdAt", aged30Cutoff] }, 1, 0] } },
          aged60Count: { $sum: { $cond: [{ $lte: ["$createdAt", aged60Cutoff] }, 1, 0] } },
          oldestCreatedAt: { $min: "$createdAt" },
        },
      },
    ]);
    const countMap: Record<string, { count: number; aged30Count: number; aged60Count: number; oldestCreatedAt?: Date }> = {};
    for (const c of counts) {
      countMap[c._id.toString()] = {
        count: c.count ?? 0,
        aged30Count: c.aged30Count ?? 0,
        aged60Count: c.aged60Count ?? 0,
        oldestCreatedAt: c.oldestCreatedAt,
      };
    }
    for (const p of products) {
      if (!p.requiresImei) continue;
      const aging = countMap[p._id.toString()];
      p.imeiCount = aging?.count ?? 0;
      p.aged30Count = aging?.aged30Count ?? 0;
      p.aged60Count = aging?.aged60Count ?? 0;
      p.oldestStockAgeDays = aging?.oldestCreatedAt
        ? Math.max(0, Math.floor((now - new Date(aging.oldestCreatedAt).getTime()) / oneDayMs))
        : 0;
    }
  }

  const batchTrackedIds = products.filter((p) => p.trackByBatch && !p.requiresImei).map((p) => p._id);
  if (branchId && batchTrackedIds.length > 0) {
    const batchCounts = await ProductBatch.aggregate([
      { $match: { shopId: shopObjectId, productId: { $in: batchTrackedIds }, branchId, quantity: { $gt: 0 } } },
      {
        $group: {
          _id: "$productId",
          quantity: { $sum: "$quantity" },
          oldestCreatedAt: { $min: "$createdAt" },
        },
      },
    ]);
    const batchMap: Record<string, { quantity: number; oldestCreatedAt?: Date }> = {};
    for (const c of batchCounts) {
      batchMap[c._id.toString()] = { quantity: c.quantity ?? 0, oldestCreatedAt: c.oldestCreatedAt };
    }
    for (const p of products) {
      if (!p.trackByBatch || p.requiresImei) continue;
      const batchStock = batchMap[p._id.toString()];
      p.quantity = batchStock?.quantity ?? 0;
      if (batchStock?.oldestCreatedAt) p.createdAt = batchStock.oldestCreatedAt;
    }
  }

  let totalQuantity = 0;
  let totalValue = 0;
  let aged30Units = 0;
  let aged60Units = 0;
  for (const p of products) {
    const qty = getStockQty(p);
    if (!p.requiresImei) {
      const createdAt = p.createdAt ? new Date(p.createdAt) : null;
      const ageDays = createdAt ? Math.max(0, Math.floor((now - createdAt.getTime()) / oneDayMs)) : 0;
      p.oldestStockAgeDays = qty > 0 ? ageDays : 0;
      p.aged30Count = qty > 0 && createdAt && createdAt <= aged30Cutoff ? qty : 0;
      p.aged60Count = qty > 0 && createdAt && createdAt <= aged60Cutoff ? qty : 0;
    }
    totalQuantity += qty;
    totalValue += (p.costPrice ?? 0) * qty;
    aged30Units += p.aged30Count ?? 0;
    aged60Units += p.aged60Count ?? 0;
  }

  const role = session.user.role;
  const isShopStaff = role === "VAT_SHOP_STAFF";

  let payloadProducts = products;
  if (isShopStaff) {
    payloadProducts = products.map((p) => {
      const { costPrice, sellPrice, ...rest } = p;
      return rest;
    }) as (StockRow & { _id: { toString(): string } })[];
  }

  const summary: { totalProducts: number; totalQuantity: number; aged30Units: number; aged60Units: number; totalValue?: number } = {
    totalProducts: products.length,
    totalQuantity,
    aged30Units,
    aged60Units,
  };
  if (!isShopStaff) summary.totalValue = totalValue;

  return Response.json({
    products: payloadProducts,
    summary,
  });
}
