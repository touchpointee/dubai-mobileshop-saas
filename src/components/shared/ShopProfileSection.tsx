"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import useSWR, { mutate } from "swr";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ShopResponse = {
  name?: string;
};

const SWR_KEY = "/api/shop";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ShopProfileSection() {
  const t = useTranslations("pages");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const { data: shop } = useSWR<ShopResponse>(SWR_KEY, fetcher);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (shop?.name) setName(shop.name);
  }, [shop?.name]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(SWR_KEY, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        await mutate(SWR_KEY);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || tErrors("somethingWentWrong"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t("shopProfile")}
        description={t("shopProfileDescription")}
      />
      <form
        onSubmit={handleSubmit}
        className="mx-6 mb-6 rounded-xl border border-slate-200 bg-white p-4 space-y-3"
      >
        <div className="space-y-1.5 max-w-md">
          <Label htmlFor="shop-name">{t("shopName")}</Label>
          <Input
            id="shop-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-3 mt-1">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}

