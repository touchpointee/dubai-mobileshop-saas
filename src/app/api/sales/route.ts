import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Sale } from "@/models/Sale";
import { Product } from "@/models/Product";
import { ProductImei } from "@/models/ProductImei";
import { ProductBatch } from "@/models/ProductBatch";
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
  const role = session!.user.role;
  const staffChannel = getChannelFromRole(role);
  const channel =
    role === "STAFF"
      ? (channelParam === "VAT" || channelParam === "NON_VAT" ? channelParam : "VAT")
      : role === "OWNER" || role === "SUPER_ADMIN"
        ? channelParam ?? "VAT"
        : staffChannel ?? "VAT";
  await connectDB();
  const list = await Sale.find({ shopId, channel })
    .populate("soldBy", "name")
    .sort({ saleDate: -1 })
    .limit(500)
    .lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const role = session!.user.role;
  const body = await request.json();
  const {
    customerId,
    customerName,
    customerPhone,
    items,
    discountType,
    discountValue,
    payments,
    notes,
    channel: bodyChannel,
  } = body;

  let staffChannel: Channel | null = getChannelFromRole(role);
  if (role === "STAFF") {
    const ch = bodyChannel === "VAT" || bodyChannel === "NON_VAT" ? bodyChannel : null;
    if (!ch) {
      return Response.json({ error: "Staff must provide channel (VAT or NON_VAT) in request body" }, { status: 400 });
    }
    staffChannel = ch;
  }
  if (!staffChannel) {
    return Response.json({ error: "Only VAT or Non-VAT staff can create sales" }, { status: 403 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "At least one item is required" }, { status: 400 });
  }
  if (!Array.isArray(payments) || payments.length === 0) {
    return Response.json({ error: "At least one payment is required" }, { status: 400 });
  }

  await connectDB();
  const shop = await Shop.findById(shopId).select("vatRate").lean() as { vatRate?: number } | null;
  const vatRate = staffChannel === "VAT" ? (shop?.vatRate ?? 5) : 0;

  let subtotal = 0;
  const saleItems: {
    productId: mongoose.Types.ObjectId;
    productName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    totalPrice: number;
    imeiId?: mongoose.Types.ObjectId;
    imei?: string;
  }[] = [];

  for (const item of items) {
    const { productId, productName, quantity, unitPrice, discount, imeiId, imei } = item;
    const qty = Number(quantity);
    const price = Number(unitPrice);
    const disc = Number(discount) || 0;
    const totalPrice = qty * price - disc;
    subtotal += totalPrice;
    saleItems.push({
      productId: new mongoose.Types.ObjectId(productId),
      productName: String(productName),
      quantity: qty,
      unitPrice: price,
      discount: disc,
      totalPrice,
      imeiId: imeiId ? new mongoose.Types.ObjectId(imeiId) : undefined,
      imei: imei ? String(imei) : undefined,
    });
  }

  let discountAmount = 0;
  if (discountType === "PERCENTAGE" && discountValue > 0) {
    discountAmount = (subtotal * Number(discountValue)) / 100;
  } else if (discountType === "FIXED" && discountValue > 0) {
    discountAmount = Number(discountValue);
  }
  for (const saleItem of saleItems) {
    const product = await Product.findOne({ _id: saleItem.productId, shopId }).select("minSellPrice name").lean() as { minSellPrice?: number; name?: string } | null;
    const minSell = product?.minSellPrice;
    if (minSell != null && minSell > 0 && subtotal > 0) {
      const allocatedDiscount = (saleItem.totalPrice / subtotal) * discountAmount;
      const effectiveLineTotal = saleItem.totalPrice - allocatedDiscount;
      const effectiveUnitPrice = effectiveLineTotal / saleItem.quantity;
      if (effectiveUnitPrice < minSell) {
        return Response.json(
          { error: `Price for ${product?.name ?? saleItem.productName} cannot go below minimum ${minSell}` },
          { status: 400 }
        );
      }
    }
  }
  const afterDiscount = subtotal - discountAmount;
  // VAT-inclusive pricing: price already includes VAT, so grandTotal = afterDiscount
  // Extract VAT from the total using: vatAmount = total * vatRate / (100 + vatRate)
  const grandTotal = afterDiscount;
  const vatableAmount = staffChannel === "VAT" ? grandTotal : 0;
  const vatAmount = vatRate > 0 ? (vatableAmount * vatRate) / (100 + vatRate) : 0;

  let paidAmount = 0;
  const PaymentMethodModel = (await import("@/models/PaymentMethod")).PaymentMethod;
  const salePayments: { paymentMethodId: mongoose.Types.ObjectId; methodName: string; amount: number; reference?: string }[] = [];
  for (const p of payments) {
    const pm = await PaymentMethodModel.findById(p.paymentMethodId).select("name").lean() as { name?: string } | null;
    const amount = Number(p.amount);
    paidAmount += amount;
    salePayments.push({
      paymentMethodId: new mongoose.Types.ObjectId(p.paymentMethodId),
      methodName: pm?.name ?? "Unknown",
      amount,
      reference: p.reference,
    });
  }

  const seq = await getNextSequence(
    new mongoose.Types.ObjectId(shopId as string),
    staffChannel === "VAT" ? COUNTER_KEYS.VAT_INVOICE : COUNTER_KEYS.NON_VAT_INVOICE
  );
  const prefix = staffChannel === "VAT" ? "VAT" : "NV";
  const invoiceNumber = formatInvoiceNumber(prefix, seq);

  const sale = await Sale.create({
    shopId,
    channel: staffChannel,
    invoiceNumber,
    customerId: customerId ? new mongoose.Types.ObjectId(customerId) : undefined,
    customerName: customerName?.trim(),
    customerPhone: customerPhone?.trim(),
    items: saleItems,
    payments: salePayments,
    subtotal,
    discountType: discountType || undefined,
    discountValue: Number(discountValue) || 0,
    discountAmount,
    vatableAmount,
    vatRate,
    vatAmount,
    grandTotal,
    paidAmount,
    changeAmount: Math.max(0, paidAmount - grandTotal),
    status: "COMPLETED",
    notes: notes?.trim(),
    soldBy: session!.user.id,
  });

  for (const item of saleItems) {
    const product = await Product.findOne({ _id: item.productId, shopId });
    if (product?.trackByBatch) {
      let remaining = item.quantity;
      const batches = await ProductBatch.find(
        { productId: item.productId, shopId, quantity: { $gt: 0 } }
      ).sort({ createdAt: 1 });
      for (const batch of batches) {
        if (remaining <= 0) break;
        const deduct = Math.min(batch.quantity, remaining);
        batch.quantity -= deduct;
        await batch.save();
        remaining -= deduct;
      }
    }
    await Product.findOneAndUpdate(
      { _id: item.productId, shopId },
      { $inc: { quantity: -item.quantity } }
    );
    if (item.imeiId) {
      await ProductImei.updateOne(
        { _id: item.imeiId, shopId },
        { status: "SOLD", saleId: sale._id }
      );
    }
  }

  const populated = await Sale.findById(sale._id)
    .populate("soldBy", "name")
    .lean();
  const shopData = await Shop.findById(shopId).select("name address phone trnNumber").lean();
  return Response.json({ ...populated, shop: shopData });
}
