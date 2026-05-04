import mongoose, { Schema, model, models } from "mongoose";

const branchSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    address: { type: String },
    phone: { type: String },
    managerName: { type: String },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

branchSchema.index({ shopId: 1, code: 1 }, { unique: true });
branchSchema.index({ shopId: 1, isActive: 1 });

export const Branch = models.Branch ?? model("Branch", branchSchema);
export type BranchDocument = mongoose.InferSchemaType<typeof branchSchema> & mongoose.Document;
