import mongoose, { Schema, model, models } from "mongoose";

const dealerSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    company: { type: String },
    address: { type: String },
    trnNumber: { type: String },
    balance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Dealer = models.Dealer ?? model("Dealer", dealerSchema);
export type DealerDocument = mongoose.InferSchemaType<typeof dealerSchema> & mongoose.Document;
