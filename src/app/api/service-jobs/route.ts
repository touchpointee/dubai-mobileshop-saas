import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { ServiceJob } from "@/models/ServiceJob";
import { getAccessibleBranchFilter, resolveAccessibleBranchId } from "@/lib/branches";

export async function GET(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const status = request.nextUrl.searchParams.get("status");
  const branchParam = request.nextUrl.searchParams.get("branchId");
  await connectDB();
  const query: Record<string, unknown> = { shopId };
  const branchId = await getAccessibleBranchFilter(shopId!, session!.user.branchId, branchParam);
  if (branchId) query.branchId = branchId;
  if (status) query.status = status;
  const list = await ServiceJob.find(query).populate("branchId", "name code").sort({ createdAt: -1 }).lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json();
  const { customerId, customerName, customerPhone, deviceDescription, deviceCondition, notes, branchId: bodyBranchId } = body;
  if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
    return Response.json({ error: "Customer name is required" }, { status: 400 });
  }
  if (!deviceDescription || typeof deviceDescription !== "string" || !deviceDescription.trim()) {
    return Response.json({ error: "Device description is required" }, { status: 400 });
  }
  await connectDB();
  const branchId = await resolveAccessibleBranchId(shopId!, bodyBranchId, session!.user.branchId);
  const job = await ServiceJob.create({
    shopId,
    branchId,
    customerId: customerId || undefined,
    customerName: customerName.trim(),
    customerPhone: customerPhone?.trim(),
    deviceDescription: deviceDescription.trim(),
    deviceCondition: deviceCondition?.trim(),
    notes: notes?.trim(),
    status: "RECEIVED",
    createdBy: session!.user.id,
  });
  return Response.json(job);
}
