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
import { resolveBranchId } from "@/lib/branches";

function getChannelFromRole(role: string): "VAT" | null {
  if (role === "VAT_STAFF" || role === "VAT_SHOP_STAFF") return "VAT";
  return null;
}

export async function GET(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const channel: "VAT" = "VAT";
  await connectDB();
  const branchParam = request.nextUrl.searchParams.get("branchId");
  const branchId = branchParam ? await resolveBranchId(shopId!, branchParam) : null;
  const match: Record<string, unknown> = { shopId, channel };
  if (branchId) match.branchId = branchId;
  const list = await Purchase.find(match)
    .populate("dealerId", "name phone")
    .populate("branchId", "name code")
    .sort({ purchaseDate: -1 })
    .lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const staffChannel = getChannelFromRole(session!.user.role);
  if (!staffChannel) {
    return Response.json({ error: "Only VAT staff can create purchases" }, { status: 403 });
  }
  const body = await request.json();
  const { dealerId, customerId, isMarginScheme, items, notes, purchaseDate: purchaseDateInput, invoiceNumber: bodyInvoiceNumber, branchId: bodyBranchId } = body;
  if ((!dealerId || !mongoose.Types.ObjectId.isValid(dealerId)) && (!customerId || !mongoose.Types.ObjectId.isValid(customerId))) {
    return Response.json({ error: "Valid dealer or customer is required" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "At least one item is required" }, { status: 400 });
  }
  await connectDB();
  const branchId = await resolveBranchId(shopId!, bodyBranchId);

  const shop = await Shop.findById(shopId).select("vatRate").lean() as { vatRate?: number } | null;
  const vatRate = typeof shop?.vatRate === "number" ? shop.vatRate : 5;

  let invoiceNumber: string;
  if (typeof bodyInvoiceNumber === "string" && bodyInvoiceNumber.trim()) {
    invoiceNumber = bodyInvoiceNumber.trim();
  } else {
    const seq = await getNextSequence(new mongoose.Types.ObjectId(shopId as string), COUNTER_KEYS.PURCHASE);
    invoiceNumber = formatInvoiceNumber("PUR", seq);
  }
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
    applyVat: boolean;
    vatAmount: number;
  }[] = [];

  for (const item of items) {
    const { productId, quantity, costPrice, imeis, discount: itemDiscount, subLoc, uom, itemCode, applyVat: itemApplyVat } = item;
    if (!productId || !quantity || costPrice === undefined) continue;
    const product = await Product.findOne({ _id: productId, shopId });
    if (!product) continue;
    const qty = Number(quantity);
    const price = Number(costPrice);
    const discount = Math.max(0, Number(itemDiscount) || 0);
    const applyVatLine = Boolean(itemApplyVat);
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
    const totalExVatLine = Math.max(0, qty * price - discount);
    const lineVatAmt = applyVatLine && vatRate > 0 ? totalExVatLine * (vatRate / 100) : 0;
    const totalInclVatLine = totalExVatLine + lineVatAmt;
    vatAmount += lineVatAmt;
    totalAmount += totalExVatLine;
    purchaseItems.push({
      productId: new mongoose.Types.ObjectId(productId),
      productName: product.name,
      quantity: qty,
      costPrice: price,
      totalPrice: totalInclVatLine,
      imeis: imeiList,
      discount,
      subLoc: typeof subLoc === "string" ? subLoc : undefined,
      uom: typeof uom === "string" && uom.trim() ? uom.trim() : "PCS",
      itemCode: typeof itemCode === "string" ? itemCode : (product as { id?: string; barcode?: string }).id ?? (product as { barcode?: string }).barcode,
      applyVat: applyVatLine,
      vatAmount: lineVatAmt,
    });
  }

  const grandTotal = totalAmount + vatAmount;
  const totalExVat = totalAmount;
  const anyApplyVat = purchaseItems.some((i) => i.applyVat);
  const createPayload: Record<string, unknown> = {
    shopId,
    branchId,
    channel: "VAT",
    dealerId: dealerId ? dealerId : undefined,
    customerId: customerId ? customerId : undefined,
    isMarginScheme: Boolean(isMarginScheme),
    invoiceNumber,
    items: purchaseItems,
    totalAmount: totalExVat,
    vatAmount,
    grandTotal,
    paidAmount: 0,
    notes: notes?.trim(),
    applyVat: anyApplyVat,
    vatRate: anyApplyVat ? vatRate : undefined,
  };
  const purchaseDate = purchaseDateInput != null && purchaseDateInput !== ""
    ? new Date(purchaseDateInput)
    : undefined;
  if (purchaseDate != null && !Number.isNaN(purchaseDate.getTime())) {
    createPayload.purchaseDate = purchaseDate;
  }
  const purchase = await Purchase.create(createPayload);

  if (dealerId) {
    await Dealer.findByIdAndUpdate(dealerId, { $inc: { balance: grandTotal } });
  }

  for (let i = 0; i < purchaseItems.length; i++) {
    const item = purchaseItems[i];
    const product = await Product.findById(item.productId);
    if (product) {
      if (product.trackByBatch) {
        await ProductBatch.create({
          productId: product._id,
          shopId,
          branchId,
          channel: "VAT",
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
            branchId,
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
    .populate("branchId", "name code")
    .lean();
  return Response.json(populated);
}
