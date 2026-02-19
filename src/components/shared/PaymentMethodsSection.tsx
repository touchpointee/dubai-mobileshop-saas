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
  isActive: boolean;
};

const SWR_KEY = "/api/payment-methods";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

const emptyForm = { name: "", nameAr: "" };

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
    setForm({ name: pm.name, nameAr: pm.nameAr ?? "" });
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
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>{tCommon("cancel")}</Button>
            <Button type="submit" disabled={saving}>{saving ? tCommon("saving") : tCommon("save")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
