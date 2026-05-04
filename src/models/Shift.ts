import mongoose, { Schema, model, models } from "mongoose";

const shiftSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    openedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    openingCash: { type: Number, default: 0 },
    countedCash: { type: Number, default: 0 },
    expectedCash: { type: Number, default: 0 },
    cashSales: { type: Number, default: 0 },
    cashRefunds: { type: Number, default: 0 },
    variance: { type: Number, default: 0 },
    paymentTotals: {
      type: Map,
      of: Number,
      default: undefined,
    },
    status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN", index: true },
    openedAt: { type: Date, default: Date.now, index: true },
    closedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

shiftSchema.index({ shopId: 1, branchId: 1, status: 1 });
shiftSchema.index({ shopId: 1, openedAt: -1 });

export const Shift = models.Shift ?? model("Shift", shiftSchema);
export type ShiftDocument = mongoose.InferSchemaType<typeof shiftSchema> & mongoose.Document;
