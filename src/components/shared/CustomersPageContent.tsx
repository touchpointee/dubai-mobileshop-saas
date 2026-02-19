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

type Customer = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
};

const SWR_KEY = "/api/customers";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

const emptyForm = { name: "", phone: "", email: "", address: "" };

export function CustomersPageContent() {
  const t = useTranslations("pages");
  const tForms = useTranslations("forms");
  const tModals = useTranslations("modals");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const { data: customers, isLoading } = useSWR<Customer[]>(SWR_KEY, fetcher);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/customers/${editing._id}` : "/api/customers";
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
        alert(data.error || tErrors("errorSavingCustomer"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(tErrors("deleteCustomerConfirm"))) return;
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (res.ok) mutate(SWR_KEY);
  }

  if (isLoading) return <PageSkeleton />;

  const columns = [
    { key: "name", header: tForms("name") },
    {
      key: "phone",
      header: tForms("phone"),
      render: (c: Customer) => <span className="text-slate-500">{c.phone || "—"}</span>,
    },
    {
      key: "email",
      header: tForms("email"),
      render: (c: Customer) => <span className="text-slate-500">{c.email || "—"}</span>,
    },
    {
      key: "actions",
      header: t("actions"),
      className: "w-36",
      render: (c: Customer) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
            <Pencil size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(c._id)}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("customers")} description={t("customersDescription")}>
        <Button onClick={openAdd}>
          <Plus size={16} className="mr-1.5" />
          {tModals("addCustomer")}
        </Button>
      </PageHeader>

      <div className="px-6 pb-6">
        <DataTable columns={columns} data={customers ?? []} emptyMessage={t("emptyCustomers")} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? tModals("editCustomer") : tModals("addCustomer")}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="cu-name">{tForms("name")} *</Label>
              <Input id="cu-name" className="mt-1.5" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="cu-phone">{tForms("phone")}</Label>
              <Input id="cu-phone" className="mt-1.5" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="cu-email">{tForms("email")}</Label>
              <Input id="cu-email" className="mt-1.5" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="cu-address">{tForms("address")}</Label>
              <Input id="cu-address" className="mt-1.5" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
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
