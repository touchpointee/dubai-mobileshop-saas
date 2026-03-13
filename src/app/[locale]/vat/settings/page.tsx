"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentMethodsSection } from "@/components/shared/PaymentMethodsSection";
import { ShopCostCodeSection } from "@/components/shared/ShopCostCodeSection";

export default function VatSettingsPage() {
  const t = useTranslations("pages");
  return (
    <div className="animate-fade-in">
      <PageHeader title={t("settings")} description={t("managePaymentMethods")} />
      <div className="space-y-6">
        <ShopCostCodeSection />
        <PaymentMethodsSection />
      </div>
    </div>
  );
}
