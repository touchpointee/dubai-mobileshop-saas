import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Product } from "@/models/Product";
import { ProductImei } from "@/models/ProductImei";
import { ProductBatch } from "@/models/ProductBatch";
import type { Channel } from "@/lib/constants";
import { getAccessibleBranchFilter } from "@/lib/branches";

export async function GET(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const channel = searchParams.get("channel") as Channel | null;
  const branchParam = searchParams.get("branchId");
  if (!code || !code.trim()) {
    return Response.json({ error: "code is required" }, { status: 400 });
  }
  const trimmed = code.trim();
  await connectDB();
  const branchId = await getAccessibleBranchFilter(shopId!, session!.user.branchId, branchParam);

  // 1. Try IMEI lookup
  const imeiDocRaw = await ProductImei.findOne({
    imei: trimmed,
    status: "IN_STOCK",
    ...(branchId ? { branchId } : {}),
  })
    .populate("productId")
    .lean();
  type ImeiWithProduct = { _id: unknown; imei: string; productId: { _id: unknown; shopId: unknown; isActive?: boolean; name?: string; sellPrice?: number; quantity?: number; brand?: string; requiresImei?: boolean; minSellPrice?: number } | null };
  const imeiDoc = imeiDocRaw as ImeiWithProduct | null;
  if (imeiDoc) {
    const productDoc = imeiDoc.productId;
    if (productDoc && String(productDoc.shopId) === String(shopId) && productDoc.isActive !== false) {
      const product = {
        _id: productDoc._id,
        name: productDoc.name,
        sellPrice: productDoc.sellPrice,
        quantity: productDoc.quantity,
        brand: productDoc.brand,
        requiresImei: productDoc.requiresImei,
        imeiCount: 1,
        minSellPrice: productDoc.minSellPrice,
      };
      return Response.json({
        type: "imei",
        product,
        imeiId: imeiDoc._id,
        imei: imeiDoc.imei,
      });
    }
  }

  // 2. Try product barcode lookup
  const barcodeQuery: { shopId: unknown; barcode: string; isActive: boolean; channel?: Channel } = {
    shopId,
    barcode: trimmed,
    isActive: true,
  };
  if (channel === "VAT") {
    barcodeQuery.channel = channel;
  }
  const productByBarcode = await Product.findOne(barcodeQuery).lean();
  if (productByBarcode) {
    const p = productByBarcode as unknown as { _id: unknown; name: string; sellPrice: number; quantity: number; brand?: string; requiresImei?: boolean; trackByBatch?: boolean; imeiCount?: number; minSellPrice?: number };
    let quantity = p.quantity ?? 0;
    if (branchId && p.trackByBatch && !p.requiresImei) {
      const batches = await ProductBatch.find({ productId: p._id, shopId, branchId, quantity: { $gt: 0 } }).select("quantity").lean();
      quantity = batches.reduce((sum, batch) => sum + (Number(batch.quantity) || 0), 0);
    }
    const product = {
      _id: p._id,
      name: p.name,
      sellPrice: p.sellPrice,
      quantity,
      brand: p.brand,
      requiresImei: p.requiresImei,
      imeiCount: p.imeiCount,
      minSellPrice: p.minSellPrice,
    };
    return Response.json({
      type: "barcode",
      product,
    });
  }

  return Response.json({ error: "Product not found" }, { status: 404 });
}
