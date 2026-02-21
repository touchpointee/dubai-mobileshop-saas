import type { Role } from "./constants";

export const ROLE_DEFAULT_PATH: Record<Role, string> = {
  SUPER_ADMIN: "/super-admin/dashboard",
  OWNER: "/owner/dashboard",
  VAT_STAFF: "/vat/pos",
  NON_VAT_STAFF: "/non-vat/pos",
  STAFF: "/staff/pos",
  VAT_SHOP_STAFF: "/vat-shop-staff/pos",
  NON_VAT_SHOP_STAFF: "/non-vat-shop-staff/pos",
};
