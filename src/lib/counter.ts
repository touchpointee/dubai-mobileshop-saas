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

/** Set counter to at least `value` (so next getNextSequence is > value). Use to sync after existing data. */
export async function setCounterIfHigher(
  shopId: Types.ObjectId,
  key: string,
  value: number
): Promise<void> {
  await connectDB();
  await Counter.findOneAndUpdate(
    { shopId, key },
    { $max: { seq: value } },
    { upsert: true }
  );
}

export function formatInvoiceNumber(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}
