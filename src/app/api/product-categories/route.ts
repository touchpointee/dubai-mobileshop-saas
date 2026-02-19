import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { ProductCategory } from "@/models/ProductCategory";

export async function GET() {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  await connectDB();
  const list = await ProductCategory.find({ shopId, isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json();
  const { name, nameAr, sortOrder } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  await connectDB();
  const cat = await ProductCategory.create({
    shopId,
    name: name.trim(),
    nameAr: nameAr?.trim(),
    sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    isActive: true,
  });
  return Response.json(cat);
}
