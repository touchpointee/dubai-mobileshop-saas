import mongoose, { Schema, model, models } from "mongoose";

const stockTransferItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    imeiId: { type: Schema.Types.ObjectId, ref: "ProductImei" },
    imei: { type: String },
    quantity: { type: Number, default: 1 },
  },
  { _id: true }
);

const stockTransferSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    transferNumber: { type: String, required: true },
    fromBranchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    toBranchId: { type: Schema.Types.ObjectId, ref: "Branch", required: true, index: true },
    items: [stockTransferItemSchema],
    status: { type: String, enum: ["COMPLETED", "VOID"], default: "COMPLETED" },
    notes: { type: String },
    transferredBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    transferDate: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

stockTransferSchema.index({ shopId: 1, transferDate: -1 });
stockTransferSchema.index({ transferNumber: 1 }, { unique: true });

export const StockTransfer = models.StockTransfer ?? model("StockTransfer", stockTransferSchema);
export type StockTransferDocument = mongoose.InferSchemaType<typeof stockTransferSchema> & mongoose.Document;
