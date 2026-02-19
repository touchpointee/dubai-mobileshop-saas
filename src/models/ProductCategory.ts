import mongoose, { Schema, model, models } from "mongoose";

const productCategorySchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productCategorySchema.index({ shopId: 1, isActive: 1 });

export const ProductCategory =
  models.ProductCategory ?? model("ProductCategory", productCategorySchema);
export type ProductCategoryDocument = mongoose.InferSchemaType<typeof productCategorySchema> &
  mongoose.Document;
