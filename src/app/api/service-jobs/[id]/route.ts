import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { ServiceJob } from "@/models/ServiceJob";
import { ServiceJobLog } from "@/models/ServiceJobLog";
import { SERVICE_JOB_STATUSES } from "@/lib/constants";

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
  const job = await ServiceJob.findOne(match).populate("branchId", "name code").lean();
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
  return Response.json(job);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, session, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  const body = await request.json();
  await connectDB();
  const match: Record<string, unknown> = { _id: id, shopId };
  if (session!.user.branchId) match.branchId = session!.user.branchId;
  const job = await ServiceJob.findOne(match);
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

  const prevStatus = job.status;
  const prevNotes = job.notes ?? "";
  const prevProposedPrice = job.proposedPrice;
  const prevFinalCharge = job.finalCharge;

  const {
    customerId,
    customerName,
    customerPhone,
    deviceDescription,
    deviceCondition,
    notes,
    status,
    proposedPrice,
    finalCharge,
    acceptedAt,
    completedAt,
    assignedTo,
  } = body;

  if (customerName !== undefined) job.customerName = String(customerName).trim();
  if (customerPhone !== undefined) job.customerPhone = customerPhone ? String(customerPhone).trim() : undefined;
  if (customerId !== undefined) job.customerId = customerId ? new mongoose.Types.ObjectId(customerId) : undefined;
  if (deviceDescription !== undefined) job.deviceDescription = String(deviceDescription).trim();
  if (deviceCondition !== undefined) job.deviceCondition = deviceCondition ? String(deviceCondition).trim() : undefined;
  if (notes !== undefined) job.notes = notes ? String(notes).trim() : undefined;
  if (status !== undefined && SERVICE_JOB_STATUSES.includes(status)) job.status = status;
  if (typeof proposedPrice === "number") job.proposedPrice = proposedPrice;
  if (typeof finalCharge === "number") job.finalCharge = finalCharge;
  if (acceptedAt !== undefined) job.acceptedAt = acceptedAt ? new Date(acceptedAt) : undefined;
  if (completedAt !== undefined) job.completedAt = completedAt ? new Date(completedAt) : undefined;
  if (assignedTo !== undefined) job.assignedTo = assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined;

  const userId = session?.user?.id ? new mongoose.Types.ObjectId(session.user.id as string) : undefined;
  const shopIdObj = shopId ? new mongoose.Types.ObjectId(shopId) : undefined;
  const logEntries: { serviceJobId: mongoose.Types.ObjectId; shopId: mongoose.Types.ObjectId; type: string; description: string; fromValue?: string; toValue?: string; note?: string; createdAt: Date; userId?: mongoose.Types.ObjectId }[] = [];
  const now = new Date();

  if (status !== undefined && prevStatus !== job.status) {
    logEntries.push({
      serviceJobId: job._id,
      shopId: shopIdObj!,
      type: "status_change",
      description: "Status changed",
      fromValue: prevStatus,
      toValue: job.status,
      createdAt: now,
      userId,
    });
  }
  if (notes !== undefined && (notes ? String(notes).trim() : "") !== prevNotes) {
    logEntries.push({
      serviceJobId: job._id,
      shopId: shopIdObj!,
      type: "note_update",
      description: "Note updated",
      createdAt: now,
      userId,
    });
  }
  if (typeof proposedPrice === "number" && prevProposedPrice !== proposedPrice) {
    logEntries.push({
      serviceJobId: job._id,
      shopId: shopIdObj!,
      type: "field_update",
      description: "Proposed price updated",
      fromValue: prevProposedPrice != null ? String(prevProposedPrice) : undefined,
      toValue: String(proposedPrice),
      createdAt: now,
      userId,
    });
  }
  if (typeof finalCharge === "number" && prevFinalCharge !== finalCharge) {
    logEntries.push({
      serviceJobId: job._id,
      shopId: shopIdObj!,
      type: "field_update",
      description: "Final charge updated",
      fromValue: prevFinalCharge != null ? String(prevFinalCharge) : undefined,
      toValue: String(finalCharge),
      createdAt: now,
      userId,
    });
  }

  await job.save();
  if (logEntries.length > 0) {
    await ServiceJobLog.insertMany(logEntries);
  }
  return Response.json(job);
}
