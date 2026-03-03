"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import useSWR, { mutate } from "swr";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Staff = { _id: string; name: string; phone?: string; isActive: boolean };

type Payment = {
  _id: string;
  amount: number;
  note?: string;
  paidDate: string;
};

type SalariesResponse = { payments: Payment[]; totalPaid: number };

export default function StaffDetailPage() {
  const t = useTranslations("pages");
  const tForms = useTranslations("forms");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const params = useParams();
  const staffId = params?.staffId as string;

  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    note: "",
    paidDate: new Date().toISOString().slice(0, 10),
  });

  const salariesUrl = useMemo(
    () =>
      `/api/staff/${staffId}/salaries?fromDate=${fromDate}&toDate=${toDate}`,
    [staffId, fromDate, toDate]
  );

  const { data: staff, isLoading: staffLoading } = useSWR<Staff>(
    staffId ? `/api/staff/${staffId}` : null,
    fetcher
  );
  const { data: salariesData, isLoading: salariesLoading } =
    useSWR<SalariesResponse>(staffId ? salariesUrl : null, fetcher);

  const payments = salariesData?.payments ?? [];
  const totalPaid = salariesData?.totalPaid ?? 0;

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (Number.isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/staff/${staffId}/salaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          note: form.note.trim() || undefined,
          paidDate: form.paidDate || new Date().toISOString().slice(0, 10),
        }),
      });
      if (res.ok) {
        setAddModal(false);
        setForm({
          amount: "",
          note: "",
          paidDate: new Date().toISOString().slice(0, 10),
        });
        mutate(salariesUrl);
        mutate("/api/staff");
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || tErrors("errorAddingSalary"));
      }
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: "paidDate",
      header: t("paidDate"),
      render: (r: Payment) => formatDate(r.paidDate),
    },
    {
      key: "amount",
      header: tForms("amount"),
      render: (r: Payment) => formatCurrency(r.amount),
    },
    {
      key: "note",
      header: t("note"),
      render: (r: Payment) => r.note || "—",
    },
  ];

  if (staffLoading || !staff) return <PageSkeleton />;

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <Link
            href="/vat/salary"
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-2"
          >
            <ArrowLeft size={16} />
            {t("staffSalary")}
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">{staff.name}</h1>
        </div>
        <Button onClick={() => setAddModal(true)}>
          <Plus size={16} className="mr-2" />
          {t("addSalaryPayment")}
        </Button>
      </div>

      <div className="px-6 pb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <div>
            <Label htmlFor="from-date" className="text-xs text-slate-500">{t("fromDate")}</Label>
            <Input
              id="from-date"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1 w-auto"
            />
          </div>
          <div>
            <Label htmlFor="to-date" className="text-xs text-slate-500">{t("toDate")}</Label>
            <Input
              id="to-date"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1 w-auto"
            />
          </div>
          <div className="flex items-end">
            <p className="text-sm text-slate-600">
              {t("totalPaid")}: <span className="font-semibold text-slate-900">{formatCurrency(totalPaid)}</span>
            </p>
          </div>
        </div>

        {salariesLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            {tCommon("loading")}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={payments}
            emptyMessage={t("noPayments")}
          />
        )}
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title={t("addSalaryPayment")}>
        <form onSubmit={handleAddPayment} className="space-y-4">
          <div>
            <Label htmlFor="pay-amount">{tForms("amount")} *</Label>
            <Input
              id="pay-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="pay-note">{t("note")}</Label>
            <Input
              id="pay-note"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder={t("optionalNotes")}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="pay-date">{t("paidDate")} *</Label>
            <Input
              id="pay-date"
              type="date"
              value={form.paidDate}
              onChange={(e) => setForm((f) => ({ ...f, paidDate: e.target.value }))}
              required
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddModal(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? tCommon("saving") : tCommon("save")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
