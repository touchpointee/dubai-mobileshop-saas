import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Branch } from "@/models/Branch";
import { ensureDefaultBranch } from "@/lib/branches";

export async function GET() {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  await connectDB();
  await ensureDefaultBranch(shopId!);
  const list = await Branch.find({ shopId }).sort({ isDefault: -1, name: 1 }).lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json();
  const { name, code, address, phone, managerName, isDefault } = body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Branch name is required" }, { status: 400 });
  }
  const cleanCode = typeof code === "string" && code.trim()
    ? code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "-").slice(0, 16)
    : name.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "-").slice(0, 16);
  if (!cleanCode) return Response.json({ error: "Branch code is required" }, { status: 400 });

  await connectDB();
  if (isDefault === true) {
    await Branch.updateMany({ shopId }, { $set: { isDefault: false } });
  }
  const branch = await Branch.create({
    shopId: new mongoose.Types.ObjectId(String(shopId)),
    name: name.trim(),
    code: cleanCode,
    address: typeof address === "string" ? address.trim() : undefined,
    phone: typeof phone === "string" ? phone.trim() : undefined,
    managerName: typeof managerName === "string" ? managerName.trim() : undefined,
    isDefault: isDefault === true,
    isActive: true,
  });
  if (!branch.isDefault) await ensureDefaultBranch(shopId!);
  return Response.json(branch);
}
