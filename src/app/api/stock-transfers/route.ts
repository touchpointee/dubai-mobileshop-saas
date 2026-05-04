import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Branch } from "@/models/Branch";
import { ProductImei } from "@/models/ProductImei";
import { Product } from "@/models/Product";
import { StockTransfer } from "@/models/StockTransfer";
import { getNextSequence, formatInvoiceNumber } from "@/lib/counter";
import { COUNTER_KEYS } from "@/lib/constants";

export async function GET() {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  await connectDB();
  const list = await StockTransfer.find({ shopId })
    .populate("fromBranchId", "name code")
    .populate("toBranchId", "name code")
    .sort({ transferDate: -1 })
    .limit(200)
    .lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json();
  const { fromBranchId, toBranchId, imeiIds, notes } = body;
  if (!mongoose.Types.ObjectId.isValid(fromBranchId) || !mongoose.Types.ObjectId.isValid(toBranchId) || String(fromBranchId) === String(toBranchId)) {
    return Response.json({ error: "Valid source and destination branches are required" }, { status: 400 });
  }
  if (!Array.isArray(imeiIds) || imeiIds.length === 0) {
    return Response.json({ error: "Select at least one IMEI to transfer" }, { status: 400 });
  }
  await connectDB();
  const [fromBranch, toBranch] = await Promise.all([
    Branch.findOne({ _id: fromBranchId, shopId, isActive: true }).lean(),
    Branch.findOne({ _id: toBranchId, shopId, isActive: true }).lean(),
  ]);
  if (!fromBranch || !toBranch) return Response.json({ error: "Branch not found" }, { status: 404 });

  const imeis = await ProductImei.find({
    _id: { $in: imeiIds.filter((id: unknown) => mongoose.Types.ObjectId.isValid(String(id))) },
    shopId,
    branchId: fromBranchId,
    status: "IN_STOCK",
  }).lean();
  if (imeis.length !== imeiIds.length) {
    return Response.json({ error: "Some IMEIs are not in stock at the source branch" }, { status: 400 });
  }
  const productIds = [...new Set(imeis.map((i) => String(i.productId)))];
  const products = await Product.find({ _id: { $in: productIds }, shopId }).select("name").lean();
  const productNameById = new Map(products.map((p) => [String(p._id), p.name]));

  const seq = await getNextSequence(new mongoose.Types.ObjectId(String(shopId)), COUNTER_KEYS.STOCK_TRANSFER);
  const transferNumber = formatInvoiceNumber("TRF", seq);
  const transfer = await StockTransfer.create({
    shopId,
    transferNumber,
    fromBranchId,
    toBranchId,
    items: imeis.map((item) => ({
      productId: item.productId,
      productName: productNameById.get(String(item.productId)) ?? "Product",
      imeiId: item._id,
      imei: item.imei,
      quantity: 1,
    })),
    notes: typeof notes === "string" ? notes.trim() : undefined,
    transferredBy: session!.user.id,
  });
  await ProductImei.updateMany(
    { _id: { $in: imeis.map((i) => i._id) }, shopId },
    { $set: { branchId: toBranchId } }
  );
  const populated = await StockTransfer.findById(transfer._id)
    .populate("fromBranchId", "name code")
    .populate("toBranchId", "name code")
    .lean();
  return Response.json(populated);
}
