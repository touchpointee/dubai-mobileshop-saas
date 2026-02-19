"use client";

import { SalesHistoryContent } from "@/components/shared/SalesHistoryContent";

export default function VatSalesPage() {
  return (
    <SalesHistoryContent
      channel="VAT"
      titleKey="salesHistory"
      descriptionKey="salesHistoryVat"
    />
  );
}
