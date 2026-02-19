"use client";

import { SalesHistoryContent } from "@/components/shared/SalesHistoryContent";

export default function NonVatSalesPage() {
  return (
    <SalesHistoryContent
      channel="NON_VAT"
      titleKey="salesHistory"
      descriptionKey="salesHistoryNonVat"
    />
  );
}
