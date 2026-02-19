import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { ReturnModel } from "@/models/Return";
import { Sale } from "@/models/Sale";
import { Product } from "@/models/Product";
import { ProductImei } from "@/models/ProductImei";
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
  const role = session!.user.role;
  const staffChannel = getChannelFromRole(role);
  let channel: Channel;
  if (role === "STAFF") {
    channel = channelParam === "VAT" || channelParam === "NON_VAT" ? channelParam : "VAT";
  } else if (role === "OWNER" || role === "SUPER_ADMIN") {
    channel = channelParam ?? "VAT";
  } else {
    channel = staffChannel ?? "VAT";
  }
  await connectDB();
  const list = await ReturnModel.find({ shopId, channel })
    .populate("saleId", "invoiceNumber")
    .sort({ returnDate: -1 })
    .limit(200)
    .lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const role = session!.user.role;
  const body = await request.json();
  const { saleId, items, reason, refundMethod, channel: bodyChannel } = body;

  let staffChannel: Channel | null = getChannelFromRole(role);
  if (role === "STAFF") {
    staffChannel = bodyChannel === "VAT" || bodyChannel === "NON_VAT" ? bodyChannel : "VAT";
  }
  if (!staffChannel) {
    return Response.json({ error: "Only VAT or Non-VAT staff can process returns" }, { status: 403 });
  }

  if (!saleId || !mongoose.Types.ObjectId.isValid(saleId)) {
    return Response.json({ error: "Valid sale is required" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "At least one item is required" }, { status: 400 });
  }

  await connectDB();
  const sale = await Sale.findOne({ _id: saleId, shopId, channel: staffChannel });
  if (!sale) return Response.json({ error: "Sale not found" }, { status: 404 });

  let totalAmount = 0;
  const returnItems: {
    productId: mongoose.Types.ObjectId;
    productName: string;
    imeiId?: mongoose.Types.ObjectId;
    imei?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[] = [];

  for (const item of items) {
    const { productId, productName, imeiId, imei, quantity, unitPrice, totalPrice } = item;
    const qty = Number(quantity);
    const price = Number(unitPrice);
    const tot = Number(totalPrice);
    totalAmount += tot;
    returnItems.push({
      productId: new mongoose.Types.ObjectId(productId),
      productName: String(productName),
      imeiId: imeiId ? new mongoose.Types.ObjectId(imeiId) : undefined,
      imei: imei ? String(imei) : undefined,
      quantity: qty,
      unitPrice: price,
      totalPrice: tot,
    });
  }

  const seq = await getNextSequence(
    new mongoose.Types.ObjectId(shopId as string),
    COUNTER_KEYS.RETURN
  );
  const returnNumber = formatInvoiceNumber("RET", seq);

  const returnDoc = await ReturnModel.create({
    shopId,
    channel: staffChannel,
    saleId,
    returnNumber,
    reason: reason?.trim(),
    items: returnItems,
    totalAmount,
    refundMethod: refundMethod?.trim(),
    status: "COMPLETED",
    processedBy: session!.user.id,
  });

  for (const item of returnItems) {
    await Product.findOneAndUpdate(
      { _id: item.productId, shopId },
      { $inc: { quantity: item.quantity } }
    );
    if (item.imeiId) {
      await ProductImei.updateOne(
        { _id: item.imeiId, shopId },
        { $set: { status: "IN_STOCK", saleId: null } }
      );
    }
  }

  sale.status = "PARTIALLY_RETURNED";
  await sale.save();

  const populated = await ReturnModel.findById(returnDoc._id)
    .populate("saleId", "invoiceNumber")
    .lean();
  return Response.json(populated);
}
