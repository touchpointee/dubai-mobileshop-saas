import mongoose, { Schema, model, models } from "mongoose";
import { SERVICE_JOB_STATUSES } from "@/lib/constants";

const serviceJobSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: "Branch", index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    deviceDescription: { type: String, required: true },
    deviceCondition: { type: String },
    notes: { type: String },
    status: { type: String, enum: SERVICE_JOB_STATUSES, default: "RECEIVED", index: true },
    proposedPrice: { type: Number },
    finalCharge: { type: Number },
    acceptedAt: { type: Date },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

serviceJobSchema.index({ shopId: 1, status: 1 });

export const ServiceJob = models.ServiceJob ?? model("ServiceJob", serviceJobSchema);
export type ServiceJobDocument = mongoose.InferSchemaType<typeof serviceJobSchema> & mongoose.Document;
