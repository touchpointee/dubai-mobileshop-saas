import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireSuperAdmin } from "@/lib/api-auth";
import { User } from "@/models/User";
import bcrypt from "bcryptjs";
import { ROLES } from "@/lib/constants";

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
    .sort({ createdAt: -1 })
    .lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { error } = await requireSuperAdmin();
  if (error) return error;
  const body = await request.json();
  const { name, email, password, role, shopId } = body;
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
    isActive: true,
  });
  const out = user.toObject();
  delete (out as Record<string, unknown>).password;
  return Response.json(out);
}
