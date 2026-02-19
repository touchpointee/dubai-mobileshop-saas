import mongoose, { Schema, model, models } from "mongoose";

const counterSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
    key: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

counterSchema.index({ shopId: 1, key: 1 }, { unique: true });

export const Counter = models.Counter ?? model("Counter", counterSchema);
export type CounterDocument = mongoose.InferSchemaType<typeof counterSchema> & mongoose.Document;
