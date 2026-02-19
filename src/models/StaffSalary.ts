import mongoose, { Schema, model, models } from "mongoose";
import { SALARY_STATUSES } from "@/lib/constants";

const staffSalarySchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    basicSalary: { type: Number, required: true },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    status: { type: String, enum: SALARY_STATUSES, default: "PENDING" },
    paidDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

staffSalarySchema.index({ shopId: 1, year: 1, month: 1 });

export const StaffSalary = models.StaffSalary ?? model("StaffSalary", staffSalarySchema);
export type StaffSalaryDocument = mongoose.InferSchemaType<typeof staffSalarySchema> &
  mongoose.Document;
