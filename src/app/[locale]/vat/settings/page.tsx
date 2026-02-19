"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentMethodsSection } from "@/components/shared/PaymentMethodsSection";

export default function VatSettingsPage() {
  const t = useTranslations("pages");
  return (
    <div className="animate-fade-in">
      <PageHeader title={t("settings")} description={t("managePaymentMethods")} />
      <div className="px-6">
        <PaymentMethodsSection />
      </div>
    </div>
  );
}
