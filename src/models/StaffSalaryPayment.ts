import mongoose, { Schema, model, models } from "mongoose";

const staffSalaryPaymentSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true, index: true },
    amount: { type: Number, required: true },
    note: { type: String },
    paidDate: { type: Date, required: true },
  },
  { timestamps: true }
);

staffSalaryPaymentSchema.index({ shopId: 1, staffId: 1 });
staffSalaryPaymentSchema.index({ paidDate: 1 });

export const StaffSalaryPayment = models.StaffSalaryPayment ?? model("StaffSalaryPayment", staffSalaryPaymentSchema);
export type StaffSalaryPaymentDocument = mongoose.InferSchemaType<typeof staffSalaryPaymentSchema> &
  mongoose.Document;
