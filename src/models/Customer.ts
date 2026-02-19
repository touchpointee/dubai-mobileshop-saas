import mongoose, { Schema, model, models } from "mongoose";

const customerSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Customer = models.Customer ?? model("Customer", customerSchema);
export type CustomerDocument = mongoose.InferSchemaType<typeof customerSchema> & mongoose.Document;
