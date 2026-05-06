import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { ServiceJobLog } from "@/models/ServiceJobLog";
import { ServiceJob } from "@/models/ServiceJob";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  await connectDB();
  const match: Record<string, unknown> = { _id: id, shopId };
  if (session!.user.branchId) match.branchId = session!.user.branchId;
  const job = await ServiceJob.findOne(match).lean();
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
  const logs = await ServiceJobLog.find({ serviceJobId: id, shopId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return Response.json(logs);
}
