import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Sale } from "@/models/Sale";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  await connectDB();
  const sale = await Sale.findOne({ _id: id, shopId })
    .populate("shopId", "name address phone trnNumber")
    .lean();
  if (!sale) return Response.json({ error: "Sale not found" }, { status: 404 });
  return Response.json(sale);
}
