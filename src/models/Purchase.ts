import mongoose, { Schema, model, models } from "mongoose";
import { CHANNELS } from "@/lib/constants";

const purchaseItemSubSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    costPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    imeis: [{ type: String }],
  },
  { _id: true }
);

const purchaseSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    channel: { type: String, enum: CHANNELS, required: true },
    dealerId: { type: Schema.Types.ObjectId, ref: "Dealer", required: true },
    invoiceNumber: { type: String, required: true },
    items: [purchaseItemSubSchema],
    totalAmount: { type: Number, required: true },
    vatAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    notes: { type: String },
    purchaseDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Purchase = models.Purchase ?? model("Purchase", purchaseSchema);
export type PurchaseDocument = mongoose.InferSchemaType<typeof purchaseSchema> & mongoose.Document;
