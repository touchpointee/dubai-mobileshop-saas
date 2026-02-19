import type { Role } from "./constants";

export const ROLE_DEFAULT_PATH: Record<Role, string> = {
  SUPER_ADMIN: "/super-admin/dashboard",
  OWNER: "/owner/dashboard",
  VAT_STAFF: "/vat/pos",
  NON_VAT_STAFF: "/non-vat/pos",
  STAFF: "/staff/pos",
};
