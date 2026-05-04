import mongoose, { Schema, model, models } from "mongoose";
import { CHANNELS, RETURN_STATUSES } from "@/lib/constants";

const returnItemSubSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    imeiId: { type: Schema.Types.ObjectId, ref: "ProductImei" },
    imei: { type: String },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
  },
  { _id: true }
);

const returnSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    channel: { type: String, enum: CHANNELS, required: true },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale", required: true },
    returnNumber: { type: String, required: true },
    reason: { type: String },
    items: [returnItemSubSchema],
    totalAmount: { type: Number, required: true },
    refundMethod: { type: String },
    status: { type: String, enum: RETURN_STATUSES, default: "COMPLETED" },
    returnDate: { type: Date, default: Date.now },
    processedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const ReturnModel = models.Return ?? model("Return", returnSchema);
export type ReturnDocument = mongoose.InferSchemaType<typeof returnSchema> & mongoose.Document;
