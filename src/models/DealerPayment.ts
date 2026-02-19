import mongoose, { Schema, model, models } from "mongoose";

const dealerPaymentSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    dealerId: { type: Schema.Types.ObjectId, ref: "Dealer", required: true, index: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

dealerPaymentSchema.index({ dealerId: 1, paymentDate: -1 });

export const DealerPayment = models.DealerPayment ?? model("DealerPayment", dealerPaymentSchema);
export type DealerPaymentDocument = mongoose.InferSchemaType<typeof dealerPaymentSchema> & mongoose.Document;
