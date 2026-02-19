"use client";

import { useEffect, useState } from "react";
import { POSScreen } from "@/components/pos/POSScreen";
import { usePosStore } from "@/stores/pos-store";
import type { Channel } from "@/lib/constants";

export default function StaffPosPage() {
  const [channel, setChannel] = useState<Channel>("VAT");
  const [vatRate, setVatRate] = useState(5);
  const clearCart = usePosStore((s) => s.clearCart);

  useEffect(() => {
    fetch("/api/shop")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.vatRate != null) setVatRate(data.vatRate);
      })
      .catch(() => {});
  }, []);

  function handleChannelChange(newChannel: Channel) {
    if (newChannel === channel) return;
    clearCart();
    setChannel(newChannel);
  }

  return (
    <POSScreen
      channel={channel}
      vatRate={channel === "VAT" ? vatRate : 0}
      allowChannelSwitch
      onChannelChange={handleChannelChange}
      includeChannelInSale
    />
  );
}
