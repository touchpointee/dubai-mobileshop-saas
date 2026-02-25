import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Product } from "@/models/Product";
import { ProductCategory } from "@/models/ProductCategory";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  await connectDB();
  const product = await Product.findOne({ _id: id, shopId }).lean();
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
  return Response.json(product);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  const body = await request.json();
  const { name, nameAr, brand, model, category, categoryId, dealerId, costPrice, sellPrice, minSellPrice, requiresImei, trackByBatch, isActive, barcode } = body;
  await connectDB();
  const product = await Product.findOne({ _id: id, shopId });
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
  if (name !== undefined) product.name = String(name).trim();
  if (nameAr !== undefined) product.nameAr = nameAr ? String(nameAr).trim() : undefined;
  if (brand !== undefined) product.brand = brand ? String(brand).trim() : undefined;
  if (model !== undefined) product.model = model ? String(model).trim() : undefined;
  if (categoryId !== undefined) {
    product.categoryId = categoryId && mongoose.Types.ObjectId.isValid(categoryId) ? categoryId : undefined;
    if (product.categoryId) {
      const cat = await ProductCategory.findOne({ _id: product.categoryId, shopId }).lean();
      if (cat) {
        const catParentId = (cat as unknown as { parentId?: unknown }).parentId;
        const parent = catParentId
          ? await ProductCategory.findById(catParentId).lean()
          : null;
        product.category = parent
          ? `${(parent as unknown as { name: string }).name} > ${(cat as unknown as { name: string }).name}`
          : (cat as unknown as { name: string }).name;
      } else {
        product.category = category !== undefined && category ? String(category).trim() : undefined;
      }
    } else {
      product.category = undefined;
    }
  } else if (category !== undefined) {
    product.category = category ? String(category).trim() : undefined;
  }
  if (dealerId !== undefined) product.dealerId = dealerId && mongoose.Types.ObjectId.isValid(dealerId) ? dealerId : undefined;
  if (typeof costPrice === "number") product.costPrice = costPrice;
  if (typeof sellPrice === "number") product.sellPrice = sellPrice;
  if (Object.prototype.hasOwnProperty.call(body, "minSellPrice")) {
    if (minSellPrice === null || minSellPrice === undefined) {
      product.minSellPrice = undefined;
    } else if (typeof minSellPrice === "number" && minSellPrice >= 0) {
      const sell = typeof sellPrice === "number" ? sellPrice : product.sellPrice;
      if (minSellPrice > sell) {
        return Response.json({ error: "Minimum selling price cannot exceed sell price" }, { status: 400 });
      }
      product.minSellPrice = minSellPrice;
    }
  }
  if (typeof requiresImei === "boolean") product.requiresImei = requiresImei;
  if (typeof trackByBatch === "boolean") product.trackByBatch = trackByBatch;
  if (typeof isActive === "boolean") product.isActive = isActive;
  if (Object.prototype.hasOwnProperty.call(body, "barcode")) {
    product.barcode = barcode != null && typeof barcode === "string" && barcode.trim() ? barcode.trim() : undefined;
  }
  await product.save();
  return Response.json(product);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  await connectDB();
  const product = await Product.findOne({ _id: id, shopId });
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
  product.isActive = false;
  await product.save();
  return Response.json({ success: true });
}
