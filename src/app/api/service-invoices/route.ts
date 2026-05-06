import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { ServiceInvoice } from "@/models/ServiceInvoice";
import { ServiceJob } from "@/models/ServiceJob";
import { Product } from "@/models/Product";
import { ProductBatch } from "@/models/ProductBatch";
import { getNextSequence, formatInvoiceNumber } from "@/lib/counter";
import { COUNTER_KEYS } from "@/lib/constants";
import type { Channel } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const jobId = request.nextUrl.searchParams.get("serviceJobId");
  await connectDB();
  const query: Record<string, unknown> = { shopId };
  if (session!.user.branchId) query.branchId = session!.user.branchId;
  if (jobId && mongoose.Types.ObjectId.isValid(jobId)) query.serviceJobId = jobId;
  const list = await ServiceInvoice.find(query).sort({ createdAt: -1 }).lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json();
  const { serviceJobId, labourAmount, items } = body;
  if (!serviceJobId || !mongoose.Types.ObjectId.isValid(serviceJobId)) {
    return Response.json({ error: "Valid service job is required" }, { status: 400 });
  }
  await connectDB();
  const jobMatch: Record<string, unknown> = { _id: serviceJobId, shopId };
  if (session!.user.branchId) jobMatch.branchId = session!.user.branchId;
  const job = await ServiceJob.findOne(jobMatch);
  if (!job) return Response.json({ error: "Service job not found" }, { status: 404 });
  const branchId = job.branchId;

  const labour = Number(labourAmount) || 0;
  const lineItems: { productId: mongoose.Types.ObjectId; productName: string; quantity: number; unitPrice: number; channel: Channel }[] = [];
  let partsSubtotal = 0;
  if (Array.isArray(items) && items.length > 0) {
    for (const it of items) {
      const { productId, productName, quantity, unitPrice, channel } = it;
      if (!productId || channel !== "VAT") continue;
      const qty = Number(quantity) || 0;
      const price = Number(unitPrice) || 0;
      if (qty <= 0) continue;
      const product = await Product.findOne({ _id: productId, shopId, channel: "VAT" });
      if (!product) continue;
      let available = product.quantity ?? 0;
      if (product.trackByBatch && branchId) {
        const batches = await ProductBatch.find({ productId, shopId, branchId, channel: "VAT", quantity: { $gt: 0 } }).select("quantity").lean();
        available = batches.reduce((sum, batch) => sum + (Number(batch.quantity) || 0), 0);
      }
      if (available < qty) {
        return Response.json(
          { error: `Insufficient stock for "${product.name}" (${channel}): need ${qty}, have ${available}` },
          { status: 400 }
        );
      }
      lineItems.push({
        productId: new mongoose.Types.ObjectId(productId),
        productName: product.name,
        quantity: qty,
        unitPrice: price,
        channel: "VAT",
      });
      partsSubtotal += qty * price;
    }
  }

  const subtotal = labour + partsSubtotal;
  const total = subtotal;

  const seq = await getNextSequence(new mongoose.Types.ObjectId(shopId as string), COUNTER_KEYS.SERVICE_INVOICE);
  const invoiceNumber = formatInvoiceNumber("SVC", seq);

  const invoice = await ServiceInvoice.create({
    shopId,
    branchId,
    serviceJobId: new mongoose.Types.ObjectId(serviceJobId),
    invoiceNumber,
    labourAmount: labour,
    items: lineItems,
    subtotal,
    discount: 0,
    total,
    paidAmount: 0,
    status: "PENDING",
  });

  for (const item of lineItems) {
    const product = await Product.findOne({ _id: item.productId, shopId });
    if (product?.trackByBatch) {
      let remaining = item.quantity;
      const batches = await ProductBatch.find({
        productId: item.productId,
        shopId,
        ...(branchId ? { branchId } : {}),
        channel: item.channel,
        quantity: { $gt: 0 },
      }).sort({ createdAt: 1 });
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
  }

  const populated = await ServiceInvoice.findById(invoice._id).lean();
  return Response.json(populated);
}
