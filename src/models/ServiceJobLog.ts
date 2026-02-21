import mongoose, { Schema, model, models } from "mongoose";

const LOG_TYPES = ["status_change", "note_update", "field_update"] as const;

const serviceJobLogSchema = new Schema(
  {
    serviceJobId: { type: Schema.Types.ObjectId, ref: "ServiceJob", required: true, index: true },
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
    type: { type: String, enum: LOG_TYPES, required: true },
    description: { type: String, required: true },
    fromValue: { type: String },
    toValue: { type: String },
    note: { type: String },
    createdAt: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: false }
);

serviceJobLogSchema.index({ serviceJobId: 1, createdAt: 1 });

export const ServiceJobLog = models.ServiceJobLog ?? model("ServiceJobLog", serviceJobLogSchema);
export type ServiceJobLogDocument = mongoose.InferSchemaType<typeof serviceJobLogSchema> & mongoose.Document;
