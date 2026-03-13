"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import useSWR, { mutate } from "swr";
import { Plus, Pencil, Copy, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/skeleton";
import { slugify } from "@/lib/utils";

type Shop = {
  _id: string;
  name: string;
  slug: string;
  nameAr?: string;
  address: string;
  phone: string;
  trnNumber?: string;
  vatRate: number;
  currency: string;
  isActive: boolean;
  costCodeMap?: Record<string, string>;
  costFalseCode?: string;
};

type ShopForm = Omit<Shop, "_id" | "isActive">;

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const API = "/api/super-admin/shops";
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

const emptyForm: ShopForm = {
  name: "",
  slug: "",
  nameAr: "",
  address: "",
  phone: "",
  trnNumber: "",
  vatRate: 5,
  currency: "AED",
  costCodeMap: {
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
  },
  costFalseCode: "",
};

function CopyUrlButton({ slug }: { slug: string }) {
  const t = useTranslations("pages");
  const [copied, setCopied] = useState(false);
  const protocol = ROOT_DOMAIN.includes("localhost") ? "http" : "https";
  const url = `${protocol}://${slug}.${ROOT_DOMAIN}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-slate-500 transition hover:bg-slate-100"
      title={url}
    >
      {copied ? <Check size={12} className="text-teal-600" /> : <Copy size={12} />}
      {copied ? t("copied") : t("copyUrl")}
    </button>
  );
}

export default function ShopsPage() {
  const t = useTranslations("pages");
  const tForms = useTranslations("forms");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const { data: shops, isLoading } = useSWR<Shop[]>(API, fetcher);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Shop | null>(null);
  const [form, setForm] = useState<ShopForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (shop: Shop) => {
    setEditing(shop);
    setForm({
      name: shop.name,
      slug: shop.slug,
      nameAr: shop.nameAr || "",
      address: shop.address,
      phone: shop.phone,
      trnNumber: shop.trnNumber || "",
      vatRate: shop.vatRate,
      currency: shop.currency,
      costCodeMap: {
        "0": shop.costCodeMap?.["0"] ?? "",
        "1": shop.costCodeMap?.["1"] ?? "",
        "2": shop.costCodeMap?.["2"] ?? "",
        "3": shop.costCodeMap?.["3"] ?? "",
        "4": shop.costCodeMap?.["4"] ?? "",
        "5": shop.costCodeMap?.["5"] ?? "",
        "6": shop.costCodeMap?.["6"] ?? "",
        "7": shop.costCodeMap?.["7"] ?? "",
        "8": shop.costCodeMap?.["8"] ?? "",
        "9": shop.costCodeMap?.["9"] ?? "",
      },
      costFalseCode: shop.costFalseCode ?? "",
    });
    setError("");
    setModalOpen(true);
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: editing ? prev.slug : slugify(value),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const url = editing ? `${API}/${editing._id}` : API;
      const payload = {
        ...form,
        costCodeMap: form.costCodeMap,
        costFalseCode: form.costFalseCode?.trim() ? form.costFalseCode.trim()[0] : "",
      };
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tErrors("failedToSaveShop"));
      await mutate(API);
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tErrors("somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (shop: Shop) => {
    await fetch(`${API}/${shop._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !shop.isActive }),
    });
    await mutate(API);
  };

  if (isLoading) return <PageSkeleton />;

  const columns = [
    { key: "name", header: tForms("name") },
    {
      key: "slug",
      header: t("slug"),
      render: (shop: Shop) => (
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
            {shop.slug}.{ROOT_DOMAIN}
          </span>
          <CopyUrlButton slug={shop.slug} />
        </div>
      ),
    },
    { key: "address", header: tForms("address") },
    { key: "phone", header: tForms("phone") },
    {
      key: "trnNumber",
      header: tForms("trnNumber").replace(/ Number$/, ""),
      render: (shop: Shop) => (
        <span className="text-slate-500">{shop.trnNumber || "—"}</span>
      ),
    },
    {
      key: "vatRate",
      header: "VAT%",
      render: (shop: Shop) => `${shop.vatRate}%`,
    },
    {
      key: "isActive",
      header: t("status"),
      render: (shop: Shop) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            shop.isActive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {shop.isActive ? t("active") : t("inactive")}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      render: (shop: Shop) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(shop)}>
            <Pencil size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleActive(shop)}
            className={shop.isActive ? "text-red-500 hover:text-red-600" : "text-emerald-600 hover:text-emerald-700"}
          >
            {shop.isActive ? t("disable") : t("enable")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("shops")} description={t("shopsRegistered", { count: shops?.length ?? 0 })}>
        <Button onClick={openAdd}>
          <Plus size={16} className="mr-1.5" />
          {t("addShop")}
        </Button>
      </PageHeader>

      <div className="px-6 pb-6">
        <DataTable columns={columns} data={shops ?? []} emptyMessage={t("emptyShops")} />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t("editShop") : t("addShop")}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("shopName")} *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t("shopNamePlaceholder")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="slug">{t("slug")} *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                  placeholder={t("slugPlaceholder")}
                  required
                />
                <span className="shrink-0 text-xs text-slate-400">.{ROOT_DOMAIN}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nameAr">{t("nameArabic")}</Label>
            <Input
              id="nameAr"
              value={form.nameAr}
              onChange={(e) => setForm((p) => ({ ...p, nameAr: e.target.value }))}
              placeholder="الاسم بالعربية"
              dir="rtl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">{tForms("address")} *</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder={t("shopAddressPlaceholder")}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">{tForms("phone")} *</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+971 50 123 4567"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trnNumber">{tForms("trnNumber")}</Label>
              <Input
                id="trnNumber"
                value={form.trnNumber}
                onChange={(e) => setForm((p) => ({ ...p, trnNumber: e.target.value }))}
                placeholder={t("taxRegistrationNumber")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vatRate">{t("vatRatePercent")}</Label>
              <Input
                id="vatRate"
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.vatRate}
                onChange={(e) => setForm((p) => ({ ...p, vatRate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">{t("currency")}</Label>
              <Input
                id="currency"
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
                placeholder="AED"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <Label className="text-sm font-medium">{t("costCodeSettings")}</Label>
            <p className="text-xs text-slate-500">
              Each digit 0–9 maps to a letter. For example, if 1 = Q and 2 = E, then a cost of 21 becomes EQ.
              When the selling price has more digits than the cost, extra positions on the left are filled with the false-code letter.
            </p>
            <div className="grid grid-cols-5 gap-2 max-w-xs">
              {["0","1","2","3","4","5","6","7","8","9"].map((digit) => (
                <div key={digit} className="space-y-1">
                  <Label className="text-[10px] text-slate-500">Digit {digit}</Label>
                  <Input
                    maxLength={1}
                    value={form.costCodeMap?.[digit] ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.slice(-1);
                      setForm((prev) => ({
                        ...prev,
                        costCodeMap: { ...(prev.costCodeMap ?? {}), [digit]: v },
                      }));
                    }}
                    className="h-8 text-center text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 space-y-1 max-w-xs">
              <Label className="text-[10px] text-slate-500">False code (padding)</Label>
              <Input
                maxLength={1}
                value={form.costFalseCode ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    costFalseCode: e.target.value.slice(-1),
                  }))
                }
                className="h-8 w-20 text-center text-sm"
                placeholder="-"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? tCommon("saving") : editing ? t("updateShop") : t("createShop")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
