"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import useSWR, { mutate } from "swr";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { PageSkeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PaymentMethod = {
  _id: string;
  name: string;
  nameAr?: string;
  type?: string;
  provider?: string;
  requiresReference?: boolean;
  isCashDrawer?: boolean;
  isActive: boolean;
};

const SWR_KEY = "/api/payment-methods";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

const METHOD_TYPES = ["CASH", "CARD", "BNPL", "BANK_TRANSFER", "WALLET", "TRADE_IN", "OTHER"];
const emptyForm = { name: "", nameAr: "", type: "OTHER", provider: "", requiresReference: false, isCashDrawer: false };

export function PaymentMethodsSection() {
  const t = useTranslations("pages");
  const tForms = useTranslations("forms");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const { data: methods, isLoading } = useSWR<PaymentMethod[]>(SWR_KEY, fetcher);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(pm: PaymentMethod) {
    setEditing(pm);
    setForm({
      name: pm.name,
      nameAr: pm.nameAr ?? "",
      type: pm.type ?? "OTHER",
      provider: pm.provider ?? "",
      requiresReference: Boolean(pm.requiresReference),
      isCashDrawer: Boolean(pm.isCashDrawer),
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/payment-methods/${editing._id}` : "/api/payment-methods";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setModalOpen(false);
        mutate(SWR_KEY);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || tErrors("errorSavingPaymentMethod"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(tErrors("removePaymentMethodConfirm"))) return;
    const res = await fetch(`/api/payment-methods/${id}`, { method: "DELETE" });
    if (res.ok) mutate(SWR_KEY);
  }

  if (isLoading) return <PageSkeleton />;

  const columns = [
    { key: "name", header: tForms("name") },
    {
      key: "nameAr",
      header: t("nameArabic"),
      render: (pm: PaymentMethod) => <span className="text-slate-500">{pm.nameAr || "—"}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (pm: PaymentMethod) => pm.type ?? "OTHER",
    },
    {
      key: "provider",
      header: "Provider",
      render: (pm: PaymentMethod) => <span className="text-slate-500">{pm.provider || "—"}</span>,
    },
    {
      key: "requiresReference",
      header: "Ref.",
      render: (pm: PaymentMethod) => (pm.requiresReference ? "Required" : "Optional"),
    },
    {
      key: "actions",
      header: t("actions"),
      className: "w-36",
      render: (pm: PaymentMethod) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(pm)}>
            <Pencil size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(pm._id)}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("paymentMethods")} description={t("managePaymentMethods")}>
        <Button onClick={openAdd}>
          <Plus size={16} className="mr-1.5" />
          {t("addMethod")}
        </Button>
      </PageHeader>

      <div className="px-6 pb-6">
        <DataTable columns={columns} data={methods ?? []} emptyMessage={t("emptyPaymentMethods")} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t("editPaymentMethod") : t("addPaymentMethod")} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="pm-name">{tForms("name")} *</Label>
            <Input id="pm-name" className="mt-1.5" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={t("namePlaceholder")} required />
          </div>
          <div>
            <Label htmlFor="pm-nameAr">{t("nameArabic")}</Label>
            <Input id="pm-nameAr" className="mt-1.5" value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} placeholder={t("nameArPlaceholder")} />
          </div>
          <div>
            <Label htmlFor="pm-type">Type</Label>
            <select
              id="pm-type"
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {METHOD_TYPES.map((type) => (
                <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="pm-provider">Provider</Label>
            <Input id="pm-provider" className="mt-1.5" value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} placeholder="Tabby, Tamara, Visa terminal..." />
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.requiresReference} onChange={(e) => setForm((f) => ({ ...f, requiresReference: e.target.checked }))} />
              Require reference at checkout
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={form.isCashDrawer} onChange={(e) => setForm((f) => ({ ...f, isCashDrawer: e.target.checked }))} />
              Counts as cash drawer money
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>{tCommon("cancel")}</Button>
            <Button type="submit" disabled={saving}>{saving ? tCommon("saving") : tCommon("save")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
