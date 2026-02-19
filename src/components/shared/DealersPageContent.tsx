"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import useSWR, { mutate } from "swr";
import { Plus, Pencil, Trash2, Banknote } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { PageSkeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

type Dealer = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
  trnNumber?: string;
  balance: number;
};

const SWR_KEY = "/api/dealers";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

const emptyForm = { name: "", phone: "", email: "", company: "", address: "", trnNumber: "" };

export function DealersPageContent() {
  const t = useTranslations("pages");
  const tForms = useTranslations("forms");
  const tModals = useTranslations("modals");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const { data: dealers, isLoading } = useSWR<Dealer[]>(SWR_KEY, fetcher);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Dealer | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentDealer, setPaymentDealer] = useState<Dealer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(d: Dealer) {
    setEditing(d);
    setForm({
      name: d.name,
      phone: d.phone ?? "",
      email: d.email ?? "",
      company: d.company ?? "",
      address: d.address ?? "",
      trnNumber: d.trnNumber ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/dealers/${editing._id}` : "/api/dealers";
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
        alert(data.error || tErrors("errorSavingDealer"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(tErrors("deleteDealerConfirm"))) return;
    const res = await fetch(`/api/dealers/${id}`, { method: "DELETE" });
    if (res.ok) mutate(SWR_KEY);
  }

  function openPaymentModal(d: Dealer) {
    setPaymentDealer(d);
    setPaymentAmount(d.balance > 0 ? String(d.balance) : "");
    setPaymentNotes("");
    setPaymentModalOpen(true);
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentDealer) return;
    const amount = Number(paymentAmount);
    if (!(amount > 0)) {
      alert(tErrors("enterAmount"));
      return;
    }
    setPaymentSaving(true);
    try {
      const res = await fetch(`/api/dealers/${paymentDealer._id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, notes: paymentNotes.trim() || undefined }),
      });
      if (res.ok) {
        setPaymentModalOpen(false);
        setPaymentDealer(null);
        mutate(SWR_KEY);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || tErrors("errorRecordingPayment"));
      }
    } finally {
      setPaymentSaving(false);
    }
  }

  if (isLoading) return <PageSkeleton />;

  const columns = [
    { key: "name", header: tForms("name") },
    {
      key: "phone",
      header: tForms("phone"),
      render: (d: Dealer) => <span className="text-slate-500">{d.phone || "—"}</span>,
    },
    {
      key: "company",
      header: t("company"),
      render: (d: Dealer) => <span className="text-slate-500">{d.company || "—"}</span>,
    },
    {
      key: "balance",
      header: t("balanceOwed"),
      render: (d: Dealer) => (
        <span className={d.balance > 0 ? "font-medium text-amber-600" : "font-medium text-slate-900"}>
          {formatCurrency(d.balance)}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      className: "w-44",
      render: (d: Dealer) => (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openPaymentModal(d)}
            disabled={!(d.balance > 0)}
            title={tModals("recordPayment")}
          >
            <Banknote size={14} className="mr-1" />
            {t("pay")}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
            <Pencil size={15} />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(d._id)}>
            <Trash2 size={15} />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("dealers")} description={t("dealersDescription")}>
        <Button onClick={openAdd}>
          <Plus size={16} className="mr-1.5" />
          {tModals("addDealer")}
        </Button>
      </PageHeader>

      <div className="px-6 pb-6">
        <DataTable columns={columns} data={dealers ?? []} emptyMessage={t("emptyDealers")} />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? tModals("editDealer") : tModals("addDealer")}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="dl-name">{tForms("name")} *</Label>
              <Input id="dl-name" className="mt-1.5" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="dl-phone">{tForms("phone")}</Label>
              <Input id="dl-phone" className="mt-1.5" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="dl-email">{tForms("email")}</Label>
              <Input id="dl-email" className="mt-1.5" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="dl-company">{t("company")}</Label>
              <Input id="dl-company" className="mt-1.5" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="dl-trn">{tForms("trnNumber")}</Label>
              <Input id="dl-trn" className="mt-1.5" value={form.trnNumber} onChange={(e) => setForm((f) => ({ ...f, trnNumber: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="dl-address">{tForms("address")}</Label>
              <Input id="dl-address" className="mt-1.5" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>{tCommon("cancel")}</Button>
            <Button type="submit" disabled={saving}>{saving ? tCommon("saving") : tCommon("save")}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title={paymentDealer ? tModals("recordPaymentTitle", { name: paymentDealer.name }) : tModals("recordPayment")}>
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <p className="text-sm text-slate-600">
            {t("balanceOwed")}: <strong>{paymentDealer ? formatCurrency(paymentDealer.balance) : "—"}</strong>
          </p>
          <div>
            <Label htmlFor="pay-amount">{tForms("amountPaid")} *</Label>
            <Input
              id="pay-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder={paymentDealer ? String(paymentDealer.balance) : ""}
              className="mt-1.5"
              required
            />
          </div>
          <div>
            <Label htmlFor="pay-notes">{t("optionalNotes")}</Label>
            <Input
              id="pay-notes"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder={tForms("notesPlaceholder")}
              className="mt-1.5"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)}>{tCommon("cancel")}</Button>
            <Button type="submit" disabled={paymentSaving}>{paymentSaving ? tCommon("saving") : tForms("markAsPaid")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
