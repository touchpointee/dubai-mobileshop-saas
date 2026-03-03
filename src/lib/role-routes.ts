import type { Role } from "./constants";

export const ROLE_DEFAULT_PATH: Record<Role, string> = {
  SUPER_ADMIN: "/super-admin/dashboard",
  VAT_STAFF: "/vat/pos",
  STAFF: "/staff/pos",
  VAT_SHOP_STAFF: "/vat-shop-staff/pos",
};
