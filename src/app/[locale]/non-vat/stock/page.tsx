"use client";

import { useTranslations } from "next-intl";
import { StockReportContent } from "@/components/shared/StockReportContent";

export default function NonVatStockPage() {
  const t = useTranslations("pages");
  return (
    <StockReportContent
      title={t("stock")}
      channel="NON_VAT"
      showChannelSelector={false}
    />
  );
}
