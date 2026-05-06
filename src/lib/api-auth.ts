import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import connectDB from "@/lib/mongodb";
import { Shop } from "@/models/Shop";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireShopSession() {
  const { session, error } = await requireSession();
  if (error) return { session: null, shopId: null, error };

  const shopId = session!.user.shopId;
  if (!shopId) {
    return {
      session: null,
      shopId: null,
      error: NextResponse.json({ error: "Shop context required" }, { status: 403 }),
    };
  }

  const headersList = await headers();
  const shopSlug = headersList.get("x-shop-slug");
  if (shopSlug) {
    await connectDB();
    const shop = await Shop.findOne({ slug: shopSlug, isActive: true }).select("_id").lean() as { _id: { toString(): string } } | null;
    if (!shop || shop._id.toString() !== shopId) {
      return {
        session: null,
        shopId: null,
        error: NextResponse.json({ error: "Shop access denied" }, { status: 403 }),
      };
    }
  }

  return { session, shopId, branchId: session!.user.branchId ?? null, error: null };
}

export async function requireSuperAdmin() {
  const { session, error } = await requireSession();
  if (error) return { session: null, error };
  if (session!.user.role !== "SUPER_ADMIN") {
    return {
      session: null,
      error: NextResponse.json({ error: "Super admin only" }, { status: 403 }),
    };
  }
  return { session, error: null };
}
