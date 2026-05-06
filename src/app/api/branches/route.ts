import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { Branch } from "@/models/Branch";
import { ensureDefaultBranch } from "@/lib/branches";

export async function GET() {
  const { shopId, branchId, error } = await requireShopSession();
  if (error) return error;
  await connectDB();
  await ensureDefaultBranch(shopId!);
  const match = branchId ? { shopId, _id: branchId } : { shopId };
  const list = await Branch.find(match).sort({ isDefault: -1, name: 1 }).lean();
  return Response.json(list);
}

export async function POST() {
  const { error } = await requireShopSession();
  if (error) return error;
  return Response.json({ error: "Branches are created and assigned by the super admin" }, { status: 403 });
}
