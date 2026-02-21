import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Purchase } from "@/models/Purchase";
import { Product } from "@/models/Product";
import { ProductImei } from "@/models/ProductImei";
import { ProductBatch } from "@/models/ProductBatch";
import { Dealer } from "@/models/Dealer";
import { getNextSequence, formatInvoiceNumber } from "@/lib/counter";
import { COUNTER_KEYS } from "@/lib/constants";
import type { Channel } from "@/lib/constants";

function getChannelFromRole(role: string): Channel | null {
  if (role === "VAT_STAFF") return "VAT";
  if (role === "NON_VAT_STAFF") return "NON_VAT";
  return null;
}

export async function GET(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const channelParam = request.nextUrl.searchParams.get("channel") as Channel | null;
  const staffChannel = getChannelFromRole(session!.user.role);
  const channel =
    session!.user.role === "OWNER" || session!.user.role === "SUPER_ADMIN"
      ? channelParam ?? "VAT"
      : staffChannel ?? "VAT";
  await connectDB();
  const list = await Purchase.find({ shopId, channel })
    .populate("dealerId", "name phone")
    .sort({ purchaseDate: -1 })
    .lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const staffChannel = getChannelFromRole(session!.user.role);
  if (!staffChannel) {
    return Response.json({ error: "Only VAT or Non-VAT staff can create purchases" }, { status: 403 });
  }
  const body = await request.json();
  const { dealerId, items, notes, purchaseDate: purchaseDateInput } = body;
  if (!dealerId || !mongoose.Types.ObjectId.isValid(dealerId)) {
    return Response.json({ error: "Valid dealer is required" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "At least one item is required" }, { status: 400 });
  }
  await connectDB();
  const seq = await getNextSequence(new mongoose.Types.ObjectId(shopId as string), COUNTER_KEYS.PURCHASE);
  const invoiceNumber = formatInvoiceNumber("PUR", seq);
  let totalAmount = 0;
  const purchaseItems: {
    productId: mongoose.Types.ObjectId;
    productName: string;
    quantity: number;
    costPrice: number;
    totalPrice: number;
    imeis: string[];
  }[] = [];

  for (const item of items) {
    const { productId, quantity, costPrice, imeis } = item;
    if (!productId || !quantity || costPrice === undefined) continue;
    const product = await Product.findOne({ _id: productId, shopId });
    if (!product) continue;
    const qty = Number(quantity);
    const price = Number(costPrice);
    let imeiList: string[] = [];
    if (Array.isArray(imeis)) {
      imeiList = imeis.filter((i: unknown) => typeof i === "string").map((i: string) => String(i).trim()).filter(Boolean);
    } else if (typeof imeis === "string" && imeis.trim()) {
      imeiList = imeis.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    }
    if (product.requiresImei && imeiList.length !== qty) {
      return Response.json(
        { error: `Product "${product.name}" requires IMEI: provide exactly ${qty} IMEI(s) (got ${imeiList.length}). Paste one per line or comma-separated.` },
        { status: 400 }
      );
    }
    const totalPrice = qty * price;
    totalAmount += totalPrice;
    purchaseItems.push({
      productId: new mongoose.Types.ObjectId(productId),
      productName: product.name,
      quantity: qty,
      costPrice: price,
      totalPrice,
      imeis: imeiList,
    });
  }

  const purchaseDate = purchaseDateInput != null && purchaseDateInput !== ""
    ? new Date(purchaseDateInput)
    : undefined;
  const createPayload: Record<string, unknown> = {
    shopId,
    channel: staffChannel,
    dealerId,
    invoiceNumber,
    items: purchaseItems,
    totalAmount,
    vatAmount: 0,
    grandTotal: totalAmount,
    paidAmount: 0,
    notes: notes?.trim(),
  };
  if (purchaseDate != null && !Number.isNaN(purchaseDate.getTime())) {
    createPayload.purchaseDate = purchaseDate;
  }
  const purchase = await Purchase.create(createPayload);

  await Dealer.findByIdAndUpdate(dealerId, { $inc: { balance: totalAmount } });

  for (let i = 0; i < purchaseItems.length; i++) {
    const item = purchaseItems[i];
    const product = await Product.findById(item.productId);
    if (product) {
      if (product.trackByBatch) {
        await ProductBatch.create({
          productId: product._id,
          shopId,
          channel: staffChannel,
          quantity: item.quantity,
          costPrice: item.costPrice,
          purchaseId: purchase._id,
        });
      }
      product.quantity = (product.quantity ?? 0) + item.quantity;
      await product.save();
      for (const imeiStr of item.imeis) {
        const trimmed = String(imeiStr).trim();
        if (!trimmed) continue;
        const exists = await ProductImei.findOne({ imei: trimmed });
        if (!exists) {
          await ProductImei.create({
            productId: product._id,
            shopId,
            imei: trimmed,
            status: "IN_STOCK",
            purchaseId: purchase._id,
          });
        }
      }
    }
  }

  const populated = await Purchase.findById(purchase._id)
    .populate("dealerId", "name phone")
    .lean();
  return Response.json(populated);
}
