import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Product } from "@/models/Product";
import { generateUniqueBarcodeForShop } from "@/lib/barcode";

export async function POST(
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
  if (product.requiresImei) {
    return Response.json({ error: "IMEI products use IMEI as barcode" }, { status: 400 });
  }
  const barcode = await generateUniqueBarcodeForShop(async (code) => {
    const existing = await Product.findOne({ shopId, barcode: code });
    return !!existing;
  });
  product.barcode = barcode;
  await product.save();
  return Response.json({ barcode });
}
