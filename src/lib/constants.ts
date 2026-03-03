export const ROLES = ["SUPER_ADMIN", "VAT_STAFF", "STAFF", "VAT_SHOP_STAFF"] as const;
export type Role = (typeof ROLES)[number];

export const CHANNELS = ["VAT", "NON_VAT"] as const;
export type Channel = (typeof CHANNELS)[number];

export const IMEI_STATUSES = ["IN_STOCK", "SOLD", "RETURNED", "DEFECTIVE"] as const;
export type ImeiStatus = (typeof IMEI_STATUSES)[number];

export const SALE_STATUSES = ["COMPLETED", "RETURNED", "PARTIALLY_RETURNED", "VOID"] as const;
export type SaleStatus = (typeof SALE_STATUSES)[number];

export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const RETURN_STATUSES = ["PENDING", "COMPLETED", "REJECTED"] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const SERVICE_JOB_STATUSES = [
  "RECEIVED",
  "CHECKING",
  "QUOTE_SENT",
  "CUSTOMER_ACCEPTED",
  "IN_SERVICE",
  "COMPLETED",
  "CANCELLED",
] as const;
export type ServiceJobStatus = (typeof SERVICE_JOB_STATUSES)[number];

export const SALARY_STATUSES = ["PENDING", "PARTIAL", "PAID"] as const;
export type SalaryStatus = (typeof SALARY_STATUSES)[number];

export const COUNTER_KEYS = {
  VAT_INVOICE: "VAT_INVOICE",
  NON_VAT_INVOICE: "NON_VAT_INVOICE",
  RETURN: "RETURN",
  PURCHASE: "PURCHASE",
  SERVICE_INVOICE: "SERVICE_INVOICE",
} as const;
