import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Product } from "@/models/Product";
import { ProductImei } from "@/models/ProductImei";
import { resolveBranchId } from "@/lib/branches";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  await connectDB();
  const branchParam = request.nextUrl.searchParams.get("branchId");
  const branchId = branchParam ? await resolveBranchId(shopId!, branchParam) : null;
  const product = await Product.findOne({ _id: id, shopId });
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
  const imeis = await ProductImei.find({ productId: id, shopId, status: "IN_STOCK", ...(branchId ? { branchId } : {}) })
    .sort({ createdAt: 1 })
    .lean();
  return Response.json(imeis);
}

export async function POST(
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
  const { imei, imei2, branchId: bodyBranchId } = body;
  if (!imei || typeof imei !== "string" || !imei.trim()) {
    return Response.json({ error: "IMEI is required" }, { status: 400 });
  }
  await connectDB();
  const branchId = await resolveBranchId(shopId!, bodyBranchId);
  const product = await Product.findOne({ _id: id, shopId });
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
  const existing = await ProductImei.findOne({ imei: imei.trim() });
  if (existing) {
    return Response.json({ error: "IMEI already exists" }, { status: 400 });
  }
  const imeiDoc = await ProductImei.create({
    productId: id,
    shopId,
    branchId,
    imei: imei.trim(),
    imei2: imei2?.trim(),
    status: "IN_STOCK",
  });
  product.quantity = await ProductImei.countDocuments({ productId: id, status: "IN_STOCK" });
  await product.save();
  return Response.json(imeiDoc);
}
