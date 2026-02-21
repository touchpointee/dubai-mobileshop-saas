import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Product } from "@/models/Product";
import { ProductImei } from "@/models/ProductImei";
import "@/models/Dealer";
import type { Channel } from "@/lib/constants";

function getChannelFromRole(role: string): Channel | null {
  if (role === "VAT_STAFF") return "VAT";
  if (role === "NON_VAT_STAFF") return "NON_VAT";
  return null;
}

export async function GET(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const role = session!.user.role;

  await connectDB();
  // Shared product list - VAT and Non-VAT see same catalog
  const list = await Product.find({ shopId, isActive: true })
    .populate("dealerId", "name phone")
    .sort({ createdAt: -1 })
    .lean();
  const listWithImei = list as Array<{ requiresImei?: boolean; _id: { toString(): string } }>;
  const requireImeiIds = listWithImei.filter((p) => p.requiresImei).map((p) => p._id);
  if (requireImeiIds.length > 0) {
    const counts = await ProductImei.aggregate([
      { $match: { productId: { $in: requireImeiIds }, status: "IN_STOCK" } },
      { $group: { _id: "$productId", count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    for (const c of counts) countMap[c._id.toString()] = c.count;
    for (const p of listWithImei) {
      if (p.requiresImei) (p as Record<string, unknown>).imeiCount = countMap[p._id.toString()] ?? 0;
    }
  }
  if (role === "STAFF") {
    for (const p of list) {
      delete (p as Record<string, unknown>).costPrice;
      delete (p as Record<string, unknown>).dealerId;
    }
  }
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const staffChannel = getChannelFromRole(session!.user.role);
  if (!staffChannel) {
    return Response.json({ error: "Only VAT or Non-VAT staff can add products" }, { status: 403 });
  }
  const body = await request.json();
  const { name, nameAr, brand, model, category, categoryId, dealerId, costPrice, sellPrice, minSellPrice, requiresImei, trackByBatch, barcode } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  if (typeof costPrice !== "number" || typeof sellPrice !== "number") {
    return Response.json({ error: "Cost and sell price are required" }, { status: 400 });
  }
  const minSell = minSellPrice != null && typeof minSellPrice === "number" && minSellPrice >= 0 ? minSellPrice : undefined;
  if (minSell != null && minSell > Number(sellPrice)) {
    return Response.json({ error: "Minimum selling price cannot exceed sell price" }, { status: 400 });
  }
  await connectDB();
  const productId = new mongoose.Types.ObjectId().toString();
  const requiresImeiVal = requiresImei === true;
  const productData: Record<string, unknown> = {
    id: productId,
    shopId: new mongoose.Types.ObjectId(shopId),
    channel: "VAT",
    name: name.trim(),
    costPrice: Number(costPrice),
    sellPrice: Number(sellPrice),
    quantity: 0,
    requiresImei: requiresImeiVal,
    trackByBatch: trackByBatch === true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (nameAr?.trim()) productData.nameAr = nameAr.trim();
  if (brand?.trim()) productData.brand = brand.trim();
  if (model?.trim()) productData.model = model.trim();
  if (category?.trim()) productData.category = category.trim();
  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) productData.categoryId = new mongoose.Types.ObjectId(categoryId);
  if (dealerId && mongoose.Types.ObjectId.isValid(dealerId)) productData.dealerId = new mongoose.Types.ObjectId(dealerId);
  if (minSell != null) productData.minSellPrice = minSell;
  if (barcode != null && typeof barcode === "string" && barcode.trim()) {
    productData.barcode = barcode.trim();
  } else if (!requiresImeiVal) {
    productData.barcode = `BC-${productId}`;
  }
  
  // Use collection.insertOne directly to ensure id is included (bypasses Mongoose schema issues)
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected");
  const collection = db.collection("products");
  const result = await collection.insertOne(productData);
  const inserted = { _id: result.insertedId, ...productData };
  const product = await Product.findOne({ _id: result.insertedId, shopId }).populate("dealerId", "name phone").lean();
  return Response.json(product ?? inserted);
}
