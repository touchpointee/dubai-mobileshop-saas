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
    return Response.json({ error: "Invalid dealer ID" }, { status: 400 });
  }
  await connectDB();
  const purchases = await Purchase.find({ shopId, dealerId: id })
    .sort({ purchaseDate: -1 })
    .limit(200)
    .lean();
  return Response.json(purchases);
}
