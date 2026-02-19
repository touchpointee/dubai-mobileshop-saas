import connectDB from "@/lib/mongodb";
import { Counter } from "@/models/Counter";
import type { Types } from "mongoose";

export async function getNextSequence(
  shopId: Types.ObjectId,
  key: string
): Promise<number> {
  await connectDB();
  const doc = await Counter.findOneAndUpdate(
    { shopId, key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc!.seq;
}

export function formatInvoiceNumber(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}
