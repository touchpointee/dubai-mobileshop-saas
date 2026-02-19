import mongoose, { Schema, model, models } from "mongoose";
import { ROLES } from "@/lib/constants";

const userSchema = new Schema(
  {
    shopId: { type: Schema.Types.ObjectId, ref: "Shop" },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ shopId: 1, role: 1 });

export const User = models.User ?? model("User", userSchema);
export type UserDocument = mongoose.InferSchemaType<typeof userSchema> & mongoose.Document;
