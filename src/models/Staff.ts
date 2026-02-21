import mongoose, { Schema, model, models } from "mongoose";

const staffSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    name: { type: String, required: true },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

staffSchema.index({ shopId: 1 });

export const Staff = models.Staff ?? model("Staff", staffSchema);
export type StaffDocument = mongoose.InferSchemaType<typeof staffSchema> &
  mongoose.Document;
