import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { ServiceJob } from "@/models/ServiceJob";
import { SERVICE_JOB_STATUSES } from "@/lib/constants";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  await connectDB();
  const job = await ServiceJob.findOne({ _id: id, shopId }).lean();
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
  return Response.json(job);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }
  const body = await request.json();
  await connectDB();
  const job = await ServiceJob.findOne({ _id: id, shopId });
  if (!job) return Response.json({ error: "Job not found" }, { status: 404 });

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

  await job.save();
  return Response.json(job);
}
