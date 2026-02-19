import mongoose, { Schema, model, models } from "mongoose";
import { CHANNELS } from "@/lib/constants";

const serviceInvoiceItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    channel: { type: String, enum: CHANNELS, required: true },
  },
  { _id: true }
);

const serviceInvoiceSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    serviceJobId: { type: Schema.Types.ObjectId, ref: "ServiceJob", required: true, index: true },
    invoiceNumber: { type: String, required: true },
    labourAmount: { type: Number, default: 0 },
    items: [serviceInvoiceItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    status: { type: String, default: "PENDING" },
  },
  { timestamps: true }
);

export const ServiceInvoice = models.ServiceInvoice ?? model("ServiceInvoice", serviceInvoiceSchema);
export type ServiceInvoiceDocument = mongoose.InferSchemaType<typeof serviceInvoiceSchema> & mongoose.Document;
