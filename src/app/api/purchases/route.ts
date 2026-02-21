import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Purchase } from "@/models/Purchase";
import { Product } from "@/models/Product";
import { ProductImei } from "@/models/ProductImei";
import { ProductBatch } from "@/models/ProductBatch";
import { Dealer } from "@/models/Dealer";
import { Shop } from "@/models/Shop";
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
  const { dealerId, items, notes, purchaseDate: purchaseDateInput, applyVat: applyVatInput } = body;
  if (!dealerId || !mongoose.Types.ObjectId.isValid(dealerId)) {
    return Response.json({ error: "Valid dealer is required" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "At least one item is required" }, { status: 400 });
  }
  const applyVat = Boolean(applyVatInput);
  await connectDB();

  let vatRate = 5;
  if (applyVat) {
    const shop = await Shop.findById(shopId).select("vatRate").lean();
    if (shop && typeof shop.vatRate === "number") vatRate = shop.vatRate;
  }

  const seq = await getNextSequence(new mongoose.Types.ObjectId(shopId as string), COUNTER_KEYS.PURCHASE);
  const invoiceNumber = formatInvoiceNumber("PUR", seq);
  let totalAmount = 0;
  let vatAmount = 0;
  const purchaseItems: {
    productId: mongoose.Types.ObjectId;
    productName: string;
    quantity: number;
    costPrice: number;
    totalPrice: number;
    imeis: string[];
    discount: number;
    subLoc?: string;
    uom: string;
    itemCode?: string;
  }[] = [];

  for (const item of items) {
    const { productId, quantity, costPrice, imeis, discount: itemDiscount, subLoc, uom, itemCode } = item;
    if (!productId || !quantity || costPrice === undefined) continue;
    const product = await Product.findOne({ _id: productId, shopId });
    if (!product) continue;
    const qty = Number(quantity);
    const price = Number(costPrice);
    const discount = Math.max(0, Number(itemDiscount) || 0);
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
    const totalAfterDisc = Math.max(0, qty * price - discount);
    if (applyVat && vatRate > 0) {
      vatAmount += (totalAfterDisc * vatRate) / (100 + vatRate);
    }
    totalAmount += totalAfterDisc;
    purchaseItems.push({
      productId: new mongoose.Types.ObjectId(productId),
      productName: product.name,
      quantity: qty,
      costPrice: price,
      totalPrice: totalAfterDisc,
      imeis: imeiList,
      discount,
      subLoc: typeof subLoc === "string" ? subLoc : undefined,
      uom: typeof uom === "string" && uom.trim() ? uom.trim() : "PCS",
      itemCode: typeof itemCode === "string" ? itemCode : (product as { id?: string; barcode?: string }).id ?? (product as { barcode?: string }).barcode,
    });
  }

  const grandTotal = totalAmount;
  const totalExVat = applyVat && vatRate > 0 ? grandTotal - vatAmount : grandTotal;
  const createPayload: Record<string, unknown> = {
    shopId,
    channel: staffChannel,
    dealerId,
    invoiceNumber,
    items: purchaseItems,
    totalAmount: applyVat && vatRate > 0 ? totalExVat : grandTotal,
    vatAmount: applyVat ? vatAmount : 0,
    grandTotal,
    paidAmount: 0,
    notes: notes?.trim(),
    applyVat,
    vatRate: applyVat ? vatRate : undefined,
  };
  const purchaseDate = purchaseDateInput != null && purchaseDateInput !== ""
    ? new Date(purchaseDateInput)
    : undefined;
  if (purchaseDate != null && !Number.isNaN(purchaseDate.getTime())) {
    createPayload.purchaseDate = purchaseDate;
  }
  const purchase = await Purchase.create(createPayload);

  await Dealer.findByIdAndUpdate(dealerId, { $inc: { balance: grandTotal } });

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
