"use client";

import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { PaymentMethodsSection } from "@/components/shared/PaymentMethodsSection";

export default function SettingsPage() {
  const t = useTranslations("pages");
  return (
    <div className="animate-fade-in">
      <PageHeader title={t("settings")} />

      <div className="px-6 pb-6 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <PaymentMethodsSection />
        </div>
      </div>
    </div>
  );
}
