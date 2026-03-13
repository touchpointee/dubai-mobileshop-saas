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
  costCodeMap?: Record<string, string>;
  costFalseCode?: string;
};

const SWR_KEY = "/api/shop";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ShopCostCodeSection() {
  const t = useTranslations("pages");
  const tCommon = useTranslations("common");
  const tForms = useTranslations("forms");
  const tErrors = useTranslations("errors");
  const { data: shop, isLoading } = useSWR<ShopResponse>(SWR_KEY, fetcher);
  const [costCodeMap, setCostCodeMap] = useState<Record<string, string>>({
    "0": "",
    "1": "",
    "2": "",
    "3": "",
    "4": "",
    "5": "",
    "6": "",
    "7": "",
    "8": "",
    "9": "",
  });
  const [falseCode, setFalseCode] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shop) return;
    setCostCodeMap((prev) => {
      const next = { ...prev };
      for (const d of Object.keys(next)) {
        next[d] = shop.costCodeMap?.[d] ?? "";
      }
      return next;
    });
    setFalseCode(shop.costFalseCode ?? "");
  }, [shop]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(SWR_KEY, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ costCodeMap, costFalseCode: falseCode }),
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

  if (isLoading && !shop) {
    return (
      <div className="px-6 py-4 text-sm text-slate-500">
        {tCommon("loading") || "Loading..."}
      </div>
    );
  }

  return (
    <div className="animate-fade-in mb-8">
      <PageHeader
        title={t("costCodeSettings")}
        description={t("costCodeSettingsDescription") ||
          "Configure your private cost code mapping for barcodes."}
      />
      <form
        onSubmit={handleSave}
        className="mx-6 mb-6 rounded-xl border border-slate-200 bg-white p-4 space-y-3"
      >
        <p className="text-xs text-slate-500">
          Each digit 0–9 maps to a letter. For example, if 1 = Q and 2 = E,
          then a cost of 21 becomes EQ. When the selling price has more digits
          than the cost, extra positions on the left are filled with the
          false-code letter.
        </p>
        <div className="grid grid-cols-5 gap-2 max-w-md">
          {["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <div key={digit} className="space-y-1">
              <Label className="text-[10px] text-slate-500">
                {tForms("digitLabel") || "Digit"} {digit}
              </Label>
              <Input
                maxLength={1}
                value={costCodeMap[digit] ?? ""}
                onChange={(e) => {
                  const v = e.target.value.slice(-1);
                  setCostCodeMap((prev) => ({ ...prev, [digit]: v }));
                }}
                className="h-8 text-center text-sm"
              />
            </div>
          ))}
        </div>
        <div className="mt-2 space-y-1 max-w-xs">
          <Label className="text-[10px] text-slate-500">
            False code (padding)
          </Label>
          <Input
            maxLength={1}
            value={falseCode}
            onChange={(e) => setFalseCode(e.target.value.slice(-1))}
            className="h-8 w-24 text-center text-sm"
            placeholder="-"
          />
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-3 mt-2">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </form>
    </div>
  );
}

