import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Shop } from "@/models/Shop";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return Response.json({ error: "slug parameter required" }, { status: 400 });
  }
  await connectDB();
  const shop = await Shop.findOne({ slug, isActive: true })
    .select("name nameAr logo slug")
    .lean();
  if (!shop) {
    return Response.json({ error: "Shop not found" }, { status: 404 });
  }
  return Response.json(shop);
}
