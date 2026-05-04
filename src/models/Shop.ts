import mongoose, { Schema, model, models } from "mongoose";

const defaultAdminShortcuts = [
  { label: "POS", href: "/vat/pos", enabled: true, order: 1 },
  { label: "Products", href: "/vat/products", enabled: true, order: 2 },
  { label: "Purchases", href: "/vat/purchases", enabled: true, order: 3 },
  { label: "Stock Report", href: "/vat/reports/stock", enabled: true, order: 4 },
  { label: "VAT Report", href: "/vat/reports/vat", enabled: true, order: 5 },
];

const adminShortcutSchema = new Schema(
  {
    label: { type: String, required: true },
    href: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: true }
);

const printSettingsSchema = new Schema(
  {
    thermalPaperWidthMm: { type: Number, default: 80 },
    thermalMarginMm: { type: Number, default: 2 },
    thermalFontSizePx: { type: Number, default: 12 },
    receiptFooter: { type: String, default: "Thank you" },
    showTrnOnReceipt: { type: Boolean, default: true },
    defaultInvoiceLanguage: { type: String, enum: ["en", "ar"], default: "en" },
    a4PaperSize: { type: String, enum: ["A4", "A5"], default: "A4" },
  },
  { _id: false }
);

const shopSchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Slug must be URL-safe (lowercase letters, numbers, hyphens)"],
    },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    trnNumber: { type: String },
    logo: { type: String },
    currency: { type: String, default: "AED" },
    vatRate: { type: Number, default: 5 },
    isActive: { type: Boolean, default: true },
    costCodeMap: {
      type: Map,
      of: String,
      default: undefined,
    },
    costFalseCode: { type: String },
    adminShortcuts: {
      type: [adminShortcutSchema],
      default: () => defaultAdminShortcuts,
    },
    printSettings: {
      type: printSettingsSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

export const Shop = models.Shop ?? model("Shop", shopSchema);
export type ShopDocument = mongoose.InferSchemaType<typeof shopSchema> & mongoose.Document;
