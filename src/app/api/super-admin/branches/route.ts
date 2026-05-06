import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireSuperAdmin } from "@/lib/api-auth";
import { ensureDefaultBranch } from "@/lib/branches";
import { Branch } from "@/models/Branch";
import { Shop } from "@/models/Shop";

function cleanBranchCode(input: unknown, fallback: string) {
  const source = typeof input === "string" && input.trim() ? input : fallback;
  return source.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "-").slice(0, 16);
}

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;
  const shopId = request.nextUrl.searchParams.get("shopId");
  await connectDB();

  const match: Record<string, unknown> = {};
  if (shopId) {
    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return Response.json({ error: "Invalid shop ID" }, { status: 400 });
    }
    match.shopId = shopId;
    await ensureDefaultBranch(shopId);
  }

  const branches = await Branch.find(match)
    .populate("shopId", "name slug")
    .sort({ "shopId.name": 1, isDefault: -1, name: 1 })
    .lean();
  return Response.json(branches);
}

export async function POST(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;
  const body = await request.json();
  const { shopId, name, code, address, phone, managerName, isDefault } = body;

  if (!shopId || !mongoose.Types.ObjectId.isValid(shopId)) {
    return Response.json({ error: "Shop is required" }, { status: 400 });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Branch name is required" }, { status: 400 });
  }
  const cleanCode = cleanBranchCode(code, name);
  if (!cleanCode) return Response.json({ error: "Branch code is required" }, { status: 400 });

  await connectDB();
  const shop = await Shop.findById(shopId).select("_id");
  if (!shop) return Response.json({ error: "Shop not found" }, { status: 404 });

  if (isDefault === true) {
    await Branch.updateMany({ shopId }, { $set: { isDefault: false } });
  }

  try {
    const branch = await Branch.create({
      shopId: new mongoose.Types.ObjectId(String(shopId)),
      name: name.trim(),
      code: cleanCode,
      address: typeof address === "string" && address.trim() ? address.trim() : undefined,
      phone: typeof phone === "string" && phone.trim() ? phone.trim() : undefined,
      managerName: typeof managerName === "string" && managerName.trim() ? managerName.trim() : undefined,
      isDefault: isDefault === true,
      isActive: true,
    });
    if (!branch.isDefault) await ensureDefaultBranch(shopId);
    return Response.json(branch);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return Response.json({ error: "Branch code already exists for this shop" }, { status: 400 });
    }
    throw err;
  }
}
