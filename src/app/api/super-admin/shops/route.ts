import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireSuperAdmin } from "@/lib/api-auth";
import { Shop } from "@/models/Shop";
import { slugify, isReservedSlug } from "@/lib/utils";

export async function GET() {
  const { error } = await requireSuperAdmin();
  if (error) return error;
  await connectDB();
  const list = await Shop.find({}).sort({ createdAt: -1 }).lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;
  const body = await request.json();
  const { name, nameAr, slug: rawSlug, address, phone, trnNumber, vatRate, currency, costCodeMap, costFalseCode } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  if (!address || !phone) {
    return Response.json({ error: "Address and phone are required" }, { status: 400 });
  }

  const slug = rawSlug ? slugify(String(rawSlug)) : slugify(name);
  if (!slug) {
    return Response.json({ error: "Slug is required (auto-generated from name if empty)" }, { status: 400 });
  }
  if (isReservedSlug(slug)) {
    return Response.json({ error: `"${slug}" is a reserved name. Choose a different slug.` }, { status: 400 });
  }

  await connectDB();

  const existing = await Shop.findOne({ slug });
  if (existing) {
    return Response.json({ error: `Slug "${slug}" is already taken` }, { status: 400 });
  }

  const shop = await Shop.create({
    name: name.trim(),
    nameAr: nameAr?.trim(),
    slug,
    address: String(address).trim(),
    phone: String(phone).trim(),
    trnNumber: trnNumber?.trim(),
    vatRate: typeof vatRate === "number" ? vatRate : 5,
    currency: currency?.trim() || "AED",
    isActive: true,
    costCodeMap: costCodeMap && typeof costCodeMap === "object" ? costCodeMap : undefined,
    costFalseCode: typeof costFalseCode === "string" && costFalseCode.trim() ? costFalseCode.trim()[0] : undefined,
  });
  return Response.json(shop);
}
