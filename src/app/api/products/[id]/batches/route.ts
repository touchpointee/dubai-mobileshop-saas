import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Product } from "@/models/Product";
import { ProductBatch } from "@/models/ProductBatch";
import type { Channel } from "@/lib/constants";

function getChannel(role: string): Channel | null {
  if (role === "VAT_STAFF") return "VAT";
  if (role === "NON_VAT_STAFF") return "NON_VAT";
  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const channel = getChannel(session!.user.role) ?? "VAT";
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid product ID" }, { status: 400 });
  }
  await connectDB();
  const product = await Product.findOne({ _id: id, shopId, channel }).lean();
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
  const batches = await ProductBatch.find({ productId: id, shopId, channel, quantity: { $gt: 0 } })
    .sort({ createdAt: 1 })
    .lean();
  return Response.json(batches);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const staffChannel = getChannel(session!.user.role);
  if (!staffChannel) {
    return Response.json({ error: "Only VAT or Non-VAT staff can add batches" }, { status: 403 });
  }
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid product ID" }, { status: 400 });
  }
  const body = await request.json();
  const { quantity, costPrice } = body;
  const qty = Number(quantity);
  const cost = Number(costPrice);
  if (!(qty > 0 && cost >= 0)) {
    return Response.json({ error: "Quantity must be positive and costPrice non-negative" }, { status: 400 });
  }
  await connectDB();
  const product = await Product.findOne({ _id: id, shopId, channel: staffChannel });
  if (!product) return Response.json({ error: "Product not found" }, { status: 404 });
  if (!product.trackByBatch) {
    return Response.json({ error: "Product is not batch-tracked" }, { status: 400 });
  }
  const batch = await ProductBatch.create({
    productId: id,
    shopId,
    channel: staffChannel,
    quantity: qty,
    costPrice: cost,
  });
  product.quantity = (product.quantity ?? 0) + qty;
  await product.save();
  return Response.json(batch);
}
