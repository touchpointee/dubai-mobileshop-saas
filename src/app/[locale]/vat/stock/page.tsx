"use client";

import { useTranslations } from "next-intl";
import { StockReportContent } from "@/components/shared/StockReportContent";

export default function VatStockPage() {
  const t = useTranslations("pages");
  return (
    <StockReportContent
      title={t("stock")}
      channel="VAT"
      showChannelSelector={false}
    />
  );
}
