import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireSuperAdmin } from "@/lib/api-auth";
import { User } from "@/models/User";
import { Branch } from "@/models/Branch";
import bcrypt from "bcryptjs";
import { ROLES } from "@/lib/constants";

async function validateBranchAssignment(role: string, shopId?: string, branchId?: string) {
  if (role === "SUPER_ADMIN") return null;
  if ((role === "STAFF" || role === "VAT_SHOP_STAFF") && !branchId) {
    throw new Error("Branch is required for staff users");
  }
  if (!branchId) return null;
  if (!shopId || !mongoose.Types.ObjectId.isValid(shopId) || !mongoose.Types.ObjectId.isValid(branchId)) {
    throw new Error("Invalid branch assignment");
  }
  const branch = await Branch.findOne({ _id: branchId, shopId, isActive: true }).select("_id");
  if (!branch) throw new Error("Branch does not belong to the selected shop");
  return branch._id;
}

export async function GET(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;
  const shopId = request.nextUrl.searchParams.get("shopId");
  await connectDB();
  const match: Record<string, unknown> = {};
  if (shopId) match.shopId = shopId;
  const list = await User.find(match)
    .select("-password")
    .populate("shopId", "name")
    .populate("branchId", "name code")
    .sort({ createdAt: -1 })
    .lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;
  const body = await request.json();
  const { name, email, password, role, shopId, branchId } = body;
  if (!name || !email || !password || !role) {
    return Response.json({ error: "Name, email, password and role are required" }, { status: 400 });
  }
  if (!ROLES.includes(role)) {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }
  if (role !== "SUPER_ADMIN" && !shopId) {
    return Response.json({ error: "Shop is required for non-super-admin users" }, { status: 400 });
  }
  await connectDB();
  let assignedBranchId = null;
  try {
    assignedBranchId = await validateBranchAssignment(role, shopId, branchId);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Invalid branch assignment" }, { status: 400 });
  }
  const existing = await User.findOne({ email: email.trim() });
  if (existing) {
    return Response.json({ error: "Email already exists" }, { status: 400 });
  }
  const hashed = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password: hashed,
    role,
    shopId: role === "SUPER_ADMIN" ? undefined : shopId,
    branchId: role === "SUPER_ADMIN" ? undefined : assignedBranchId ?? undefined,
    isActive: true,
  });
  const out = user.toObject();
  delete (out as Record<string, unknown>).password;
  return Response.json(out);
}
