import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Branch } from "@/models/Branch";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return Response.json({ error: "Invalid ID" }, { status: 400 });
  const body = await request.json();
  await connectDB();
  const branch = await Branch.findOne({ _id: id, shopId });
  if (!branch) return Response.json({ error: "Branch not found" }, { status: 404 });

  if (typeof body.name === "string" && body.name.trim()) branch.name = body.name.trim();
  if (typeof body.code === "string" && body.code.trim()) {
    branch.code = body.code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "-").slice(0, 16);
  }
  if (body.address !== undefined) branch.address = typeof body.address === "string" && body.address.trim() ? body.address.trim() : undefined;
  if (body.phone !== undefined) branch.phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : undefined;
  if (body.managerName !== undefined) branch.managerName = typeof body.managerName === "string" && body.managerName.trim() ? body.managerName.trim() : undefined;
  if (typeof body.isActive === "boolean") branch.isActive = body.isActive;
  if (body.isDefault === true) {
    await Branch.updateMany({ shopId, _id: { $ne: branch._id } }, { $set: { isDefault: false } });
    branch.isDefault = true;
    branch.isActive = true;
  }
  await branch.save();
  return Response.json(branch);
}
