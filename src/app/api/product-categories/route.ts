import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { ProductCategory } from "@/models/ProductCategory";

export async function GET() {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  await connectDB();
  const list = await ProductCategory.find({ shopId, isActive: true })
    .sort({ parentId: 1, sortOrder: 1, name: 1 })
    .lean();
  const idToName = new Map<string, string>();
  for (const c of list) {
    const id = (c as { _id: unknown })._id?.toString?.();
    if (id && "name" in c && typeof c.name === "string") idToName.set(id, c.name);
  }
  const withParent = list.map((c) => {
    const item = { ...c } as Record<string, unknown>;
    const rawId = (c as { _id?: unknown })._id;
    item._id = rawId != null ? String(rawId) : rawId;
    const parentId = (c as { parentId?: unknown }).parentId;
    if (parentId != null && parentId !== "") {
      const pid = typeof parentId === "object" && parentId !== null && "toString" in parentId
        ? (parentId as { toString(): string }).toString()
        : String(parentId);
      item.parentId = pid;
      item.parentName = idToName.get(pid) ?? null;
    } else {
      item.parentId = null;
    }
    return item;
  });
  return Response.json(withParent);
}

export async function POST(request: NextRequest) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json();
  const { name, nameAr, sortOrder } = body;
  const rawParentId = body.parentId;
  const bodyParentId = rawParentId != null && rawParentId !== ""
    ? String(rawParentId).trim()
    : undefined;
  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  await connectDB();
  const shopIdObj = new mongoose.Types.ObjectId(shopId);
  let parentIdObj: mongoose.Types.ObjectId | undefined;
  if (bodyParentId) {
    if (!mongoose.Types.ObjectId.isValid(bodyParentId)) {
      return Response.json({ error: "Invalid parent category" }, { status: 400 });
    }
    const parent = await ProductCategory.findOne({
      _id: bodyParentId,
      shopId: shopIdObj,
      isActive: true,
    }).lean();
    if (!parent) {
      return Response.json({ error: "Parent category not found" }, { status: 400 });
    }
    parentIdObj = new mongoose.Types.ObjectId(bodyParentId);
  }

  const doc = new ProductCategory({
    shopId: shopIdObj,
    name: name.trim(),
    nameAr: (nameAr != null && String(nameAr).trim()) || undefined,
    sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    isActive: true,
    ...(parentIdObj != null && { parentId: parentIdObj }),
  });
  await doc.save();

  const saved = await ProductCategory.findById(doc._id).lean();
  if (!saved) {
    return Response.json({ error: "Failed to read created category" }, { status: 500 });
  }
  const raw = saved as Record<string, unknown>;
  const out: Record<string, unknown> = {
    _id: String(raw._id),
    shopId: String(raw.shopId),
    name: raw.name,
    nameAr: raw.nameAr ?? null,
    sortOrder: raw.sortOrder ?? 0,
    isActive: raw.isActive ?? true,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    parentId: raw.parentId != null ? String(raw.parentId) : null,
  };
  return Response.json(out);
}
