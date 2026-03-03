"use client";

import { useTranslations } from "next-intl";
import { StockReportContent } from "@/components/shared/StockReportContent";

export default function StockReportPage() {
  const t = useTranslations("pages");
  return (
    <StockReportContent
      title={t("stockReport")}
      channel="VAT"
      showChannelSelector={false}
    />
  );
}
