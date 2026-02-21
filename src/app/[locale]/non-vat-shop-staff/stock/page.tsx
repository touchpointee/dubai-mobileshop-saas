import { StaffStockContent } from "@/components/shared/StaffStockContent";

export default function NonVatShopStaffStockPage() {
  return (
    <StaffStockContent
      channel="NON_VAT"
      showChannelSelector={false}
    />
  );
}
