import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Product } from "@/models/Product";
import { ProductBatch } from "@/models/ProductBatch";
import { getCategoryPathDisplayString } from "@/lib/category-path";
import { generateUniqueBarcodeForShop } from "@/lib/barcode";
import { ProductImei } from "@/models/ProductImei";
import "@/models/Dealer";

function getChannelFromRole(role: string): "VAT" | null {
  if (role === "VAT_STAFF" || role === "VAT_SHOP_STAFF") return "VAT";
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
    return Response.json({ error: "Only VAT staff can add products" }, { status: 403 });
  }
  const body = await request.json();
  const { name, nameAr, brand, model, category, categoryId, dealerId, costPrice, sellPrice, minSellPrice, requiresImei, trackByBatch, barcode, startingStock } = body;
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
  const requiresImeiVal = requiresImei === true;
  const startingQty =
    !requiresImeiVal && startingStock != null && Number(startingStock) >= 0
      ? Math.floor(Number(startingStock))
      : 0;
  await connectDB();
  const productId = new mongoose.Types.ObjectId().toString();
  const productData: Record<string, unknown> = {
    id: productId,
    shopId: new mongoose.Types.ObjectId(shopId),
    channel: "VAT",
    name: name.trim(),
    costPrice: Number(costPrice),
    sellPrice: Number(sellPrice),
    quantity: startingQty,
    requiresImei: requiresImeiVal,
    trackByBatch: trackByBatch === true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  if (nameAr?.trim()) productData.nameAr = nameAr.trim();
  if (brand?.trim()) productData.brand = brand.trim();
  if (model?.trim()) productData.model = model.trim();
  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    productData.categoryId = new mongoose.Types.ObjectId(categoryId);
    const pathDisplay = await getCategoryPathDisplayString(categoryId, shopId);
    if (pathDisplay) {
      productData.category = pathDisplay;
    } else if (category?.trim()) {
      productData.category = category.trim();
    }
  } else if (category?.trim()) {
    productData.category = category.trim();
  }
  if (dealerId && mongoose.Types.ObjectId.isValid(dealerId)) productData.dealerId = new mongoose.Types.ObjectId(dealerId);
  if (minSell != null) productData.minSellPrice = minSell;
  if (barcode != null && typeof barcode === "string" && barcode.trim()) {
    productData.barcode = barcode.trim();
  } else if (!requiresImeiVal) {
    productData.barcode = await generateUniqueBarcodeForShop(async (code) => {
      const existing = await Product.findOne({ shopId, barcode: code });
      return !!existing;
    });
  }
  
  // Use collection.insertOne directly to ensure id is included (bypasses Mongoose schema issues)
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected");
  const collection = db.collection("products");
  const result = await collection.insertOne(productData);
  const insertedId = result.insertedId;
  const trackByBatchVal = productData.trackByBatch === true;
  if (startingQty > 0 && trackByBatchVal && !requiresImeiVal) {
    await ProductBatch.create({
      productId: insertedId,
      shopId: new mongoose.Types.ObjectId(shopId),
      channel: "VAT",
      quantity: startingQty,
      costPrice: Number(costPrice),
    });
  }
  const inserted = { _id: insertedId, ...productData };
  const product = await Product.findOne({ _id: insertedId, shopId }).populate("dealerId", "name phone").lean();
  return Response.json(product ?? inserted);
}
