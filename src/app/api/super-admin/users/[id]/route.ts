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
  const user = await User.findById(id).select("-password").populate("shopId", "name").populate("branchId", "name code").lean();
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });
  return Response.json(user);
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
  const { name, email, password, role, shopId, branchId, isActive } = body;
  await connectDB();
  const user = await User.findById(id);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });
  if (name !== undefined) user.name = String(name).trim();
  if (email !== undefined) user.email = String(email).trim().toLowerCase();
  if (password && String(password).length >= 6) {
    user.password = await bcrypt.hash(String(password), 12);
  }
  const nextRole = role && ROLES.includes(role) ? role : user.role;
  const nextShopId = nextRole === "SUPER_ADMIN" ? undefined : (shopId ?? user.shopId?.toString());
  if (role && ROLES.includes(role)) {
    user.role = nextRole;
  }
  if (nextRole === "SUPER_ADMIN") {
    user.shopId = undefined;
    user.branchId = undefined;
  } else {
    if (!nextShopId) return Response.json({ error: "Shop is required for non-super-admin users" }, { status: 400 });
    let assignedBranchId = null;
    try {
      assignedBranchId = await validateBranchAssignment(nextRole, nextShopId, branchId ?? user.branchId?.toString());
    } catch (err) {
      return Response.json({ error: err instanceof Error ? err.message : "Invalid branch assignment" }, { status: 400 });
    }
    user.shopId = nextShopId;
    if (branchId === "" || assignedBranchId === null) {
      user.branchId = undefined;
    } else if (assignedBranchId) {
      user.branchId = assignedBranchId;
    }
  }
  if (typeof isActive === "boolean") user.isActive = isActive;
  await user.save();
  const out = user.toObject();
  delete (out as Record<string, unknown>).password;
  return Response.json(out);
}
