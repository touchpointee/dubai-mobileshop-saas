import mongoose from "mongoose";
import { Branch } from "@/models/Branch";

export async function ensureDefaultBranch(shopId: string | mongoose.Types.ObjectId) {
  const shopObjId = new mongoose.Types.ObjectId(String(shopId));
  let branch = await Branch.findOne({ shopId: shopObjId, isDefault: true, isActive: true });
  if (branch) return branch;

  branch = await Branch.findOne({ shopId: shopObjId, isActive: true }).sort({ createdAt: 1 });
  if (branch) {
    branch.isDefault = true;
    await branch.save();
    return branch;
  }

  return Branch.create({
    shopId: shopObjId,
    name: "Main Branch",
    code: "MAIN",
    isDefault: true,
    isActive: true,
  });
}

export async function resolveBranchId(shopId: string | mongoose.Types.ObjectId, branchId?: string | null) {
  if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
    const branch = await Branch.findOne({ _id: branchId, shopId, isActive: true }).select("_id");
    if (branch) return branch._id;
  }
  const branch = await ensureDefaultBranch(shopId);
  return branch._id;
}
