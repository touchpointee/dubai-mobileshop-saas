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
  const raw = cat as Record<string, unknown>;
  const out = {
    _id: String(raw._id),
    shopId: String(raw.shopId),
    name: raw.name,
    nameAr: raw.nameAr ?? null,
    sortOrder: raw.sortOrder ?? 0,
    isActive: raw.isActive ?? true,
    parentId: raw.parentId != null ? String(raw.parentId) : null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
  return Response.json(out);
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
  const { name, nameAr, sortOrder, isActive, parentId: bodyParentId } = body;
  await connectDB();
  const cat = await ProductCategory.findOne({ _id: id, shopId });
  if (!cat) return Response.json({ error: "Category not found" }, { status: 404 });
  if (name !== undefined) cat.name = String(name).trim();
  if (nameAr !== undefined) cat.nameAr = nameAr ? String(nameAr).trim() : undefined;
  if (typeof sortOrder === "number") cat.sortOrder = sortOrder;
  if (typeof isActive === "boolean") cat.isActive = isActive;
  if (Object.prototype.hasOwnProperty.call(body, "parentId")) {
    if (bodyParentId == null || bodyParentId === "") {
      cat.parentId = undefined;
    } else {
      if (!mongoose.Types.ObjectId.isValid(bodyParentId)) {
        return Response.json({ error: "Invalid parent category" }, { status: 400 });
      }
      if (bodyParentId === id) {
        return Response.json({ error: "Category cannot be its own parent" }, { status: 400 });
      }
      const parent = await ProductCategory.findOne({
        _id: bodyParentId,
        shopId,
        isActive: true,
      }).lean();
      if (!parent) {
        return Response.json({ error: "Parent category not found" }, { status: 400 });
      }
      // Cycle check: new parent must not be a descendant of the category being edited
      type CatLean = { parentId?: unknown };
      let ancestorId: string | null = (parent as CatLean).parentId != null
        ? String((parent as CatLean).parentId)
        : null;
      while (ancestorId) {
        if (ancestorId === id) {
          return Response.json(
            { error: "Parent cannot be a descendant of this category (would create a cycle)" },
            { status: 400 }
          );
        }
        const ancestor = await ProductCategory.findOne(
          { _id: ancestorId, shopId, isActive: true },
          { parentId: 1 }
        ).lean();
        const ancParent = ancestor ? (ancestor as unknown as CatLean).parentId : null;
        ancestorId = ancParent != null ? String(ancParent) : null;
      }
      cat.parentId = new mongoose.Types.ObjectId(bodyParentId);
    }
  }
  await cat.save();
  const saved = await ProductCategory.findById(id).lean();
  if (!saved) return Response.json({ error: "Category not found" }, { status: 404 });
  const raw = saved as Record<string, unknown>;
  const out = {
    _id: String(raw._id),
    shopId: String(raw.shopId),
    name: raw.name,
    nameAr: raw.nameAr ?? null,
    sortOrder: raw.sortOrder ?? 0,
    isActive: raw.isActive ?? true,
    parentId: raw.parentId != null ? String(raw.parentId) : null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
  return Response.json(out);
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
  const subcategoryCount = await ProductCategory.countDocuments({
    parentId: id,
    shopId,
    isActive: true,
  });
  if (subcategoryCount > 0) {
    return Response.json(
      { error: "Cannot delete category that has subcategories" },
      { status: 400 }
    );
  }
  cat.isActive = false;
  await cat.save();
  return Response.json({ success: true });
}
