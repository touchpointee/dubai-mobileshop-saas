import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Sale } from "@/models/Sale";
import { Product } from "@/models/Product";
import { ProductImei } from "@/models/ProductImei";
import { ProductBatch } from "@/models/ProductBatch";
import { Shop } from "@/models/Shop";
import { getNextSequence, setCounterIfHigher, formatInvoiceNumber } from "@/lib/counter";
import { COUNTER_KEYS } from "@/lib/constants";
import { getAccessibleBranchFilter, resolveAccessibleBranchId } from "@/lib/branches";

function getChannelFromRole(role: string): "VAT" | null {
  if (role === "VAT_STAFF" || role === "VAT_SHOP_STAFF") return "VAT";
  return null;
}

export async function GET(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const channel: "VAT" = "VAT";
  const branchParam = request.nextUrl.searchParams.get("branchId");
  await connectDB();
  const branchId = await getAccessibleBranchFilter(shopId!, session!.user.branchId, branchParam);
  const match: Record<string, unknown> = { shopId, channel };
  if (branchId) match.branchId = branchId;
  const list = await Sale.find(match)
    .populate("soldBy", "name")
    .populate("branchId", "name code")
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
    branchId: bodyBranchId,
    channel: bodyChannel,
  } = body;

  const staffChannel: "VAT" | null = getChannelFromRole(role);
  if (role === "STAFF" && bodyChannel !== "VAT") {
    return Response.json({ error: "Only VAT channel is supported" }, { status: 400 });
  }
  if (!staffChannel) {
    return Response.json({ error: "Only VAT staff can create sales" }, { status: 403 });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "At least one item is required" }, { status: 400 });
  }
  if (!Array.isArray(payments) || payments.length === 0) {
    return Response.json({ error: "At least one payment is required" }, { status: 400 });
  }

  await connectDB();
  const branchId = await resolveAccessibleBranchId(shopId!, bodyBranchId, session!.user.branchId);
  const shop = await Shop.findById(shopId).select("vatRate").lean() as { vatRate?: number } | null;
  const vatRate = shop?.vatRate ?? 5;

  let subtotal = 0;
  const saleItems: {
    productId: mongoose.Types.ObjectId;
    productName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    totalPrice: number;
    costAmount?: number;
    imeiId?: mongoose.Types.ObjectId;
    imei?: string;
    isMarginScheme?: boolean;
    marginCost?: number;
    marginProfit?: number;
    marginVatAmount?: number;
    taxableAmount?: number;
    normalVatAmount?: number;
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
  let hasMarginSchemeItems = false;
  let totalVatAmount = 0;
  let normalVatAmount = 0;
  let marginSchemeVatAmount = 0;
  let vatableAmount = 0;

  for (let i = 0; i < saleItems.length; i++) {
    const saleItem = saleItems[i];
    const product = await Product.findOne({ _id: saleItem.productId, shopId }).select("minSellPrice name costPrice isMarginScheme requiresImei trackByBatch").lean() as { minSellPrice?: number; name?: string; costPrice?: number; isMarginScheme?: boolean; requiresImei?: boolean; trackByBatch?: boolean } | null;
    if (saleItem.imeiId) {
      const imeiInBranch = await ProductImei.exists({ _id: saleItem.imeiId, shopId, branchId, status: "IN_STOCK" });
      if (!imeiInBranch) {
        return Response.json({ error: `IMEI for ${product?.name ?? saleItem.productName} is not in stock at this branch` }, { status: 400 });
      }
    } else if (product?.trackByBatch && !product.requiresImei) {
      const batches = await ProductBatch.find({ productId: saleItem.productId, shopId, branchId, quantity: { $gt: 0 } }).select("quantity").lean();
      const available = batches.reduce((sum, batch) => sum + (Number(batch.quantity) || 0), 0);
      if (available < saleItem.quantity) {
        return Response.json({ error: `Only ${available} unit(s) of ${product.name ?? saleItem.productName} are available at this branch` }, { status: 400 });
      }
    }
    
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

    let itemVat = 0;
    const allocatedDiscount = subtotal > 0 ? (saleItem.totalPrice / subtotal) * discountAmount : 0;
    const effectiveLineTotal = saleItem.totalPrice - allocatedDiscount;

    if (product?.isMarginScheme) {
      hasMarginSchemeItems = true;
      
      const costAmount = (product.costPrice || 0) * saleItem.quantity;
      const marginProfit = Math.max(0, effectiveLineTotal - costAmount);
      
      if (marginProfit > 0 && vatRate > 0) {
        itemVat = (marginProfit * vatRate) / (100 + vatRate);
      }
      const taxableAmount = Math.max(0, marginProfit - itemVat);
      marginSchemeVatAmount += itemVat;
      vatableAmount += taxableAmount;
      saleItems[i] = {
        ...saleItem,
        isMarginScheme: true,
        costAmount,
        marginCost: costAmount,
        marginProfit,
        marginVatAmount: itemVat,
        taxableAmount,
        normalVatAmount: 0,
      };
    } else {
      if (vatRate > 0) {
        itemVat = (effectiveLineTotal * vatRate) / (100 + vatRate);
      }
      const taxableAmount = Math.max(0, effectiveLineTotal - itemVat);
      normalVatAmount += itemVat;
      vatableAmount += taxableAmount;
      saleItems[i] = {
        ...saleItem,
        isMarginScheme: false,
        costAmount: (product?.costPrice || 0) * saleItem.quantity,
        marginCost: 0,
        marginProfit: 0,
        marginVatAmount: 0,
        taxableAmount,
        normalVatAmount: itemVat,
      };
    }
    totalVatAmount += itemVat;
  }

  const afterDiscount = subtotal - discountAmount;
  const grandTotal = afterDiscount;
  const vatAmount = totalVatAmount;

  let paidAmount = 0;
  const PaymentMethodModel = (await import("@/models/PaymentMethod")).PaymentMethod;
  const salePayments: { paymentMethodId: mongoose.Types.ObjectId; methodName: string; methodType?: string; provider?: string; amount: number; reference?: string }[] = [];
  for (const p of payments) {
    const pm = await PaymentMethodModel.findById(p.paymentMethodId).select("name type provider requiresReference").lean() as { name?: string; type?: string; provider?: string; requiresReference?: boolean } | null;
    const amount = Number(p.amount);
    const reference = typeof p.reference === "string" ? p.reference.trim() : "";
    if (pm?.requiresReference && !reference) {
      return Response.json({ error: `Reference is required for ${pm.name ?? "this payment method"}` }, { status: 400 });
    }
    paidAmount += amount;
    salePayments.push({
      paymentMethodId: new mongoose.Types.ObjectId(p.paymentMethodId),
      methodName: pm?.name ?? "Unknown",
      methodType: pm?.type,
      provider: pm?.provider,
      amount,
      reference: reference || undefined,
    });
  }

  const counterKey = COUNTER_KEYS.VAT_INVOICE;
  const shopObjId = new mongoose.Types.ObjectId(shopId as string);
  const prefix = "VAT";

  const salePayload = {
    shopId,
    branchId,
    channel: "VAT",
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
    normalVatAmount,
    marginSchemeVatAmount,
    grandTotal,
    paidAmount,
    changeAmount: Math.max(0, paidAmount - grandTotal),
    hasMarginSchemeItems,
    status: "COMPLETED" as const,
    notes: notes?.trim(),
    soldBy: session!.user.id,
  };

  let sale: mongoose.Document | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const [maxResult] = await Sale.aggregate<{ maxNum: number }>()
      .match({ shopId: shopObjId, channel: "VAT" })
      .addFields({ num: { $toInt: { $arrayElemAt: [{ $split: ["$invoiceNumber", "-"] }, 1] } } })
      .group({ _id: null, maxNum: { $max: "$num" } })
      .exec();
    const maxExistingSeq = maxResult?.maxNum ?? 0;

    let seq = await getNextSequence(shopObjId, counterKey);
    if (seq <= maxExistingSeq) {
      seq = maxExistingSeq + 1;
      await setCounterIfHigher(shopObjId, counterKey, seq);
    }

    const invoiceNumber = formatInvoiceNumber(prefix, seq);

    try {
      sale = await Sale.create({ ...salePayload, invoiceNumber });
      break;
    } catch (err: unknown) {
      const isDup = err && typeof err === "object" && "code" in err && (err as { code?: number }).code === 11000
        && "keyPattern" in err && (err as { keyPattern?: Record<string, unknown> }).keyPattern?.invoiceNumber;
      if (attempt < 1 && isDup) {
        await setCounterIfHigher(shopObjId, counterKey, seq);
        continue;
      }
      throw err;
    }
  }
  if (!sale) throw new Error("Sale creation failed");

  for (const item of saleItems) {
    const product = await Product.findOne({ _id: item.productId, shopId });
    if (product?.trackByBatch) {
      let remaining = item.quantity;
      const batches = await ProductBatch.find(
        { productId: item.productId, shopId, branchId, quantity: { $gt: 0 } }
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
        { _id: item.imeiId, shopId, branchId },
        { status: "SOLD", saleId: sale._id }
      );
    }
  }

  const populated = await Sale.findById(sale._id)
    .populate("soldBy", "name")
    .populate("branchId", "name code")
    .lean();
  const shopData = await Shop.findById(shopId).select("name address phone trnNumber printSettings").lean();
  return Response.json({ ...populated, shop: shopData });
}
