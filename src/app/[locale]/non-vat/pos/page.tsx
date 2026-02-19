"use client";

import { POSScreen } from "@/components/pos/POSScreen";

export default function NonVatPosPage() {
  return <POSScreen channel="NON_VAT" vatRate={0} />;
}
