import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireSuperAdmin } from "@/lib/api-auth";
import { Branch } from "@/models/Branch";
import { User } from "@/models/User";

function cleanBranchCode(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "-").slice(0, 16);
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
  await connectDB();
  const branch = await Branch.findById(id);
  if (!branch) return Response.json({ error: "Branch not found" }, { status: 404 });

  if (typeof body.name === "string" && body.name.trim()) branch.name = body.name.trim();
  if (typeof body.code === "string" && body.code.trim()) {
    const code = cleanBranchCode(body.code);
    if (!code) return Response.json({ error: "Branch code is required" }, { status: 400 });
    branch.code = code;
  }
  if (body.address !== undefined) branch.address = typeof body.address === "string" && body.address.trim() ? body.address.trim() : undefined;
  if (body.phone !== undefined) branch.phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : undefined;
  if (body.managerName !== undefined) branch.managerName = typeof body.managerName === "string" && body.managerName.trim() ? body.managerName.trim() : undefined;
  if (typeof body.isActive === "boolean") branch.isActive = body.isActive;
  if (body.isDefault === true) {
    await Branch.updateMany({ shopId: branch.shopId, _id: { $ne: branch._id } }, { $set: { isDefault: false } });
    branch.isDefault = true;
    branch.isActive = true;
  }

  try {
    await branch.save();
    return Response.json(branch);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) {
      return Response.json({ error: "Branch code already exists for this shop" }, { status: 400 });
    }
    throw err;
  }
}

export async function DELETE(
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
  const branch = await Branch.findById(id);
  if (!branch) return Response.json({ error: "Branch not found" }, { status: 404 });
  if (branch.isDefault) return Response.json({ error: "Default branch cannot be disabled" }, { status: 400 });

  branch.isActive = false;
  await branch.save();
  await User.updateMany({ branchId: branch._id }, { $unset: { branchId: "" } });
  return Response.json({ ok: true });
}
