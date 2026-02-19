import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { ProductCategory } from "@/models/ProductCategory";

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
  const cat = await ProductCategory.findOne({ _id: id, shopId }).lean();
  if (!cat) return Response.json({ error: "Category not found" }, { status: 404 });
  return Response.json(cat);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  const body = await request.json();
  const { name, nameAr, sortOrder, isActive } = body;
  await connectDB();
  const cat = await ProductCategory.findOne({ _id: id, shopId });
  if (!cat) return Response.json({ error: "Category not found" }, { status: 404 });
  if (name !== undefined) cat.name = String(name).trim();
  if (nameAr !== undefined) cat.nameAr = nameAr ? String(nameAr).trim() : undefined;
  if (typeof sortOrder === "number") cat.sortOrder = sortOrder;
  if (typeof isActive === "boolean") cat.isActive = isActive;
  await cat.save();
  return Response.json(cat);
}

export async function DELETE(
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
  const cat = await ProductCategory.findOne({ _id: id, shopId });
  if (!cat) return Response.json({ error: "Category not found" }, { status: 404 });
  cat.isActive = false;
  await cat.save();
  return Response.json({ success: true });
}
