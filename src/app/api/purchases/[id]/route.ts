import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Purchase } from "@/models/Purchase";

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
  const purchase = await Purchase.findOne({ _id: id, shopId })
    .populate("dealerId", "name phone")
    .lean();
  if (!purchase) return Response.json({ error: "Purchase not found" }, { status: 404 });
  return Response.json(purchase);
}
