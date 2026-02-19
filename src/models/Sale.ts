import mongoose, { Schema, model, models } from "mongoose";
import { CHANNELS, DISCOUNT_TYPES, SALE_STATUSES } from "@/lib/constants";

const saleItemSubSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },
    imeiId: { type: Schema.Types.ObjectId, ref: "ProductImei" },
    imei: { type: String },
  },
  { _id: true }
);

const salePaymentSubSchema = new Schema(
  {
    paymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod", required: true },
    methodName: { type: String, required: true },
    amount: { type: Number, required: true },
    reference: { type: String },
  },
  { _id: true }
);

const saleSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    channel: { type: String, enum: CHANNELS, required: true, index: true },
    invoiceNumber: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String },
    customerPhone: { type: String },
    items: [saleItemSubSchema],
    payments: [salePaymentSubSchema],
    subtotal: { type: Number, required: true },
    discountType: { type: String, enum: DISCOUNT_TYPES },
    discountValue: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    vatableAmount: { type: Number, default: 0 },
    vatRate: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    changeAmount: { type: Number, default: 0 },
    status: { type: String, enum: SALE_STATUSES, default: "COMPLETED" },
    notes: { type: String },
    soldBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    saleDate: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

saleSchema.index({ invoiceNumber: 1 }, { unique: true });
saleSchema.index({ shopId: 1, saleDate: -1 });
saleSchema.index({ shopId: 1, channel: 1, saleDate: -1 });

export const Sale = models.Sale ?? model("Sale", saleSchema);
export type SaleDocument = mongoose.InferSchemaType<typeof saleSchema> & mongoose.Document;
