import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { requireShopSession } from "@/lib/api-auth";
import { ServiceJob } from "@/models/ServiceJob";

export async function GET(request: NextRequest) {
  const { shopId, error } = await requireShopSession();
  if (error) return error;
  const status = request.nextUrl.searchParams.get("status");
  await connectDB();
  const query: Record<string, unknown> = { shopId };
  if (status) query.status = status;
  const list = await ServiceJob.find(query).sort({ createdAt: -1 }).lean();
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  const { session, shopId, error } = await requireShopSession();
  if (error) return error;
  const body = await request.json();
  const { customerId, customerName, customerPhone, deviceDescription, deviceCondition, notes } = body;
  if (!customerName || typeof customerName !== "string" || !customerName.trim()) {
    return Response.json({ error: "Customer name is required" }, { status: 400 });
  }
  if (!deviceDescription || typeof deviceDescription !== "string" || !deviceDescription.trim()) {
    return Response.json({ error: "Device description is required" }, { status: 400 });
  }
  await connectDB();
  const job = await ServiceJob.create({
    shopId,
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
