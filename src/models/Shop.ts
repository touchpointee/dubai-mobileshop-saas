import mongoose, { Schema, model, models } from "mongoose";

const shopSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Slug must be URL-safe (lowercase letters, numbers, hyphens)"],
    },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    trnNumber: { type: String },
    logo: { type: String },
    currency: { type: String, default: "AED" },
    vatRate: { type: Number, default: 5 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Shop = models.Shop ?? model("Shop", shopSchema);
export type ShopDocument = mongoose.InferSchemaType<typeof shopSchema> & mongoose.Document;
