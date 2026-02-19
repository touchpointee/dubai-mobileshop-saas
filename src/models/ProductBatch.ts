import mongoose, { Schema, model, models } from "mongoose";
import { CHANNELS } from "@/lib/constants";

const productBatchSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    channel: { type: String, enum: CHANNELS, required: true, index: true },
    quantity: { type: Number, required: true, default: 0 },
    costPrice: { type: Number, required: true },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
  },
  { timestamps: true }
);

productBatchSchema.index({ productId: 1, channel: 1, createdAt: 1 });

export const ProductBatch =
  models.ProductBatch ?? model("ProductBatch", productBatchSchema);
export type ProductBatchDocument = mongoose.InferSchemaType<typeof productBatchSchema> &
  mongoose.Document;
