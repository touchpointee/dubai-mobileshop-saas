import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireSuperAdmin } from "@/lib/api-auth";
import { Shop } from "@/models/Shop";
import { slugify, isReservedSlug } from "@/lib/utils";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  await connectDB();
  const shop = await Shop.findById(id).lean();
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });
  return Response.json(shop);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSuperAdmin();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  const body = await request.json();
  const { name, nameAr, slug: rawSlug, address, phone, trnNumber, vatRate, currency, isActive } = body;
  await connectDB();
  const shop = await Shop.findById(id);
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

  if (rawSlug !== undefined) {
    const slug = slugify(String(rawSlug));
    if (!slug) {
      return Response.json({ error: "Slug cannot be empty" }, { status: 400 });
    }
    if (isReservedSlug(slug)) {
      return Response.json({ error: `"${slug}" is a reserved name` }, { status: 400 });
    }
    const existing = await Shop.findOne({ slug, _id: { $ne: id } });
    if (existing) {
      return Response.json({ error: `Slug "${slug}" is already taken` }, { status: 400 });
    }
    shop.slug = slug;
  }

  if (name !== undefined) shop.name = String(name).trim();
  if (nameAr !== undefined) shop.nameAr = nameAr ? String(nameAr).trim() : undefined;
  if (address !== undefined) shop.address = String(address).trim();
  if (phone !== undefined) shop.phone = String(phone).trim();
  if (trnNumber !== undefined) shop.trnNumber = trnNumber ? String(trnNumber).trim() : undefined;
  if (typeof vatRate === "number") shop.vatRate = vatRate;
  if (currency !== undefined) shop.currency = String(currency).trim();
  if (typeof isActive === "boolean") shop.isActive = isActive;
  await shop.save();
  return Response.json(shop);
}
