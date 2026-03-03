"use client";

import { useEffect, useState } from "react";
import { POSScreen } from "@/components/pos/POSScreen";

export default function StaffPosPage() {
  const [vatRate, setVatRate] = useState(5);

  useEffect(() => {
    fetch("/api/shop")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.vatRate != null) setVatRate(data.vatRate);
      })
      .catch(() => {});
  }, []);

  return (
    <POSScreen
      channel="VAT"
      vatRate={vatRate}
      includeChannelInSale
    />
  );
}
