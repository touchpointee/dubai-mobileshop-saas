import mongoose, { Schema, model, models } from "mongoose";

const expenseCategorySchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, required: true },
    nameAr: { type: String },
  },
  { timestamps: true }
);

export const ExpenseCategory =
  models.ExpenseCategory ?? model("ExpenseCategory", expenseCategorySchema);
export type ExpenseCategoryDocument = mongoose.InferSchemaType<typeof expenseCategorySchema> &
  mongoose.Document;
