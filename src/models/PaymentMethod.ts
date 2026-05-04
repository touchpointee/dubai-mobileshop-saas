import mongoose, { Schema, model, models } from "mongoose";

const paymentMethodSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: {
      type: String,
      enum: ["CASH", "CARD", "BNPL", "BANK_TRANSFER", "WALLET", "TRADE_IN", "OTHER"],
      default: "OTHER",
    },
    provider: { type: String },
    requiresReference: { type: Boolean, default: false },
    isCashDrawer: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const PaymentMethod = models.PaymentMethod ?? model("PaymentMethod", paymentMethodSchema);
export type PaymentMethodDocument = mongoose.InferSchemaType<typeof paymentMethodSchema> & mongoose.Document;
