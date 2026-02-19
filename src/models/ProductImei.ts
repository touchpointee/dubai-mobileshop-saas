import mongoose, { Schema, model, models } from "mongoose";
import { IMEI_STATUSES } from "@/lib/constants";

const productImeiSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
    imei: { type: String, required: true },
    imei2: { type: String },
    status: { type: String, enum: IMEI_STATUSES, default: "IN_STOCK", index: true },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale" },
  },
  { timestamps: true }
);

productImeiSchema.index({ imei: 1 }, { unique: true });

export const ProductImei = models.ProductImei ?? model("ProductImei", productImeiSchema);
export type ProductImeiDocument = mongoose.InferSchemaType<typeof productImeiSchema> & mongoose.Document;
