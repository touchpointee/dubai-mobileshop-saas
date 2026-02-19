import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireSuperAdmin } from "@/lib/api-auth";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { ROLES } from "@/lib/constants";

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
  const user = await User.findById(id).select("-password").populate("shopId", "name").lean();
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
  const { name, email, password, role, shopId, isActive } = body;
  await connectDB();
  const user = await User.findById(id);
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });
  if (name !== undefined) user.name = String(name).trim();
  if (email !== undefined) user.email = String(email).trim().toLowerCase();
  if (password && String(password).length >= 6) {
    user.password = await bcrypt.hash(String(password), 12);
  }
  if (role && ROLES.includes(role)) {
    user.role = role;
    user.shopId = role === "SUPER_ADMIN" ? undefined : shopId;
  }
  if (typeof isActive === "boolean") user.isActive = isActive;
  await user.save();
  const out = user.toObject();
  delete (out as Record<string, unknown>).password;
  return Response.json(out);
}
