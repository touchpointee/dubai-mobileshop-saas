import mongoose, { Schema, model, models } from "mongoose";

const expenseSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "ExpenseCategory", required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    receipt: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

expenseSchema.index({ shopId: 1, date: -1 });

export const Expense = models.Expense ?? model("Expense", expenseSchema);
export type ExpenseDocument = mongoose.InferSchemaType<typeof expenseSchema> & mongoose.Document;
