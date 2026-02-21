import mongoose, { Schema, model, models } from "mongoose";
import { CHANNELS } from "@/lib/constants";

const productSchema = new Schema(
  {
    // NOTE: Some deployments may have a unique DB index on `id` (e.g. `id_1`).
    // If missing, inserts can fail with E11000 dup key { id: null }.
    // Ensure every Product gets a unique `id` value.
    id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    channel: { type: String, enum: CHANNELS, required: true, index: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    brand: { type: String },
    model: { type: String },
    category: { type: String },
    categoryId: { type: Schema.Types.ObjectId, ref: "ProductCategory" },
    dealerId: { type: Schema.Types.ObjectId, ref: "Dealer" },
    costPrice: { type: Number, required: true },
    sellPrice: { type: Number, required: true },
    minSellPrice: { type: Number },
    quantity: { type: Number, default: 0 },
    requiresImei: { type: Boolean, default: false },
    trackByBatch: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    barcode: { type: String, sparse: true },
  },
  { timestamps: true }
);

productSchema.index({ shopId: 1, channel: 1, isActive: 1 });
productSchema.index({ shopId: 1, barcode: 1 }, { unique: true, sparse: true });

// Ensure id is always set before save/create (works even if model was cached before id field was added)
productSchema.pre("validate", function (next) {
  if (!this.id || this.id === null || this.id === undefined) {
    this.id = new mongoose.Types.ObjectId().toString();
  }
  next();
});

export const Product = models.Product ?? model("Product", productSchema);
export type ProductDocument = mongoose.InferSchemaType<typeof productSchema> & mongoose.Document;
