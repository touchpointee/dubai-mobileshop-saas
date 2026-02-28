import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Product } from "@/models/Product";
import { ProductImei } from "@/models/ProductImei";
import { ProductBatch } from "@/models/ProductBatch";
import { Purchase } from "@/models/Purchase";
import { Sale } from "@/models/Sale";
import { ReturnModel } from "@/models/Return";

const LIMIT = 100;

type AddedRow = { date: string; invoiceNumber: string; quantity: number; costPrice: number; totalPrice: number };

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;

  const role = session!.user.role;
  if (role === "VAT_SHOP_STAFF" || role === "NON_VAT_SHOP_STAFF") {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  const { productId } = await params;
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return Response.json({ error: "Invalid product ID" }, { status: 400 });
  }

  await connectDB();

  const product = await Product.findOne({ _id: productId, shopId }).lean();
  if (!product) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }

  const productChannel = (product as { channel?: string }).channel;
  if (role === "VAT_STAFF" && productChannel !== "VAT") {
    return Response.json({ error: "Access denied to this product" }, { status: 403 });
  }
  if (role === "NON_VAT_STAFF" && productChannel !== "NON_VAT") {
    return Response.json({ error: "Access denied to this product" }, { status: 403 });
  }

  const productObjId = new mongoose.Types.ObjectId(productId);
  const p = product as unknown as {
    _id: unknown;
    name: string;
    brand?: string;
    category?: string;
    channel: string;
    quantity: number;
    requiresImei?: boolean;
    costPrice: number;
    sellPrice: number;
    createdAt?: Date;
  };

  let currentStock = p.quantity ?? 0;
  if (p.requiresImei) {
    const count = await ProductImei.countDocuments({
      productId: productObjId,
      status: "IN_STOCK",
    });
    currentStock = count > 0 ? count : (p.quantity ?? 0);
  }

  const purchases = await Purchase.find({
    shopId,
    channel: p.channel,
    "items.productId": productObjId,
  })
    .sort({ purchaseDate: -1 })
    .limit(LIMIT)
    .lean();

  const added: AddedRow[] = [];
  for (const doc of purchases) {
    const d = doc as { purchaseDate?: Date; invoiceNumber?: string; items?: { productId: unknown; quantity: number; costPrice: number; totalPrice: number }[] };
    const date = d.purchaseDate ? new Date(d.purchaseDate).toISOString() : "";
    const inv = d.invoiceNumber ?? "";
    for (const item of d.items ?? []) {
      if (item.productId && item.productId.toString() === productId) {
        added.push({
          date,
          invoiceNumber: inv,
          quantity: item.quantity ?? 0,
          costPrice: item.costPrice ?? 0,
          totalPrice: item.totalPrice ?? 0,
        });
      }
    }
  }

  const batches = await ProductBatch.find({
    productId: productObjId,
    shopId,
    channel: p.channel,
  })
    .sort({ createdAt: -1 })
    .limit(LIMIT)
    .lean();
  for (const b of batches) {
    const batch = b as unknown as { purchaseId?: unknown; createdAt?: Date; quantity: number; costPrice: number };
    if (batch.purchaseId) continue;
    const date = batch.createdAt ? new Date(batch.createdAt).toISOString() : "";
    const qty = batch.quantity ?? 0;
    const cost = batch.costPrice ?? 0;
    added.push({
      date,
      invoiceNumber: "Stock add (batch)",
      quantity: qty,
      costPrice: cost,
      totalPrice: qty * cost,
    });
  }

  if (added.length === 0 && currentStock > 0) {
    const date = p.createdAt ? new Date(p.createdAt).toISOString() : "";
    added.push({
      date,
      invoiceNumber: "Opening balance",
      quantity: currentStock,
      costPrice: p.costPrice ?? 0,
      totalPrice: (p.costPrice ?? 0) * currentStock,
    });
  }

  added.sort((a, b) => (b.date < a.date ? -1 : b.date > a.date ? 1 : 0));

  const sales = await Sale.find({
    shopId,
    channel: p.channel,
    status: "COMPLETED",
    "items.productId": productObjId,
  })
    .sort({ saleDate: -1 })
    .limit(LIMIT)
    .lean();

  const sold: { date: string; invoiceNumber: string; quantity: number; unitPrice: number; totalPrice: number; imei?: string }[] = [];
  for (const doc of sales) {
    const d = doc as { saleDate?: Date; invoiceNumber?: string; items?: { productId: unknown; quantity: number; unitPrice: number; totalPrice: number; imei?: string }[] };
    const date = d.saleDate ? new Date(d.saleDate).toISOString() : "";
    const inv = d.invoiceNumber ?? "";
    for (const item of d.items ?? []) {
      if (item.productId && item.productId.toString() === productId) {
        sold.push({
          date,
          invoiceNumber: inv,
          quantity: item.quantity ?? 0,
          unitPrice: item.unitPrice ?? 0,
          totalPrice: item.totalPrice ?? 0,
          imei: item.imei,
        });
      }
    }
  }

  const returns = await ReturnModel.find({
    shopId,
    "items.productId": productObjId,
  })
    .sort({ returnDate: -1 })
    .limit(LIMIT)
    .lean();

  const returned: { date: string; returnNumber: string; quantity: number }[] = [];
  for (const doc of returns) {
    const d = doc as { returnDate?: Date; returnNumber?: string; items?: { productId: unknown; quantity: number }[] };
    const date = d.returnDate ? new Date(d.returnDate).toISOString() : "";
    const refNum = d.returnNumber ?? "";
    for (const item of d.items ?? []) {
      if (item.productId && item.productId.toString() === productId) {
        returned.push({
          date,
          returnNumber: refNum,
          quantity: item.quantity ?? 0,
        });
      }
    }
  }

  return Response.json({
    product: {
      _id: p._id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      channel: p.channel,
      currentStock,
      requiresImei: p.requiresImei,
      costPrice: p.costPrice,
      sellPrice: p.sellPrice,
    },
    added,
    sold,
    returned,
  });
}
