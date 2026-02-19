"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import useSWR, { mutate } from "swr";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Staff = { _id: string; name: string };

type SalaryRecord = {
  _id: string;
  staff: Staff | string;
  month: number;
  year: number;
  basicSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  totalPaid: number;
  status: "PENDING" | "PARTIAL" | "PAID";
  notes?: string;
};

export default function SalaryPage() {
  const t = useTranslations("pages");
  const tForms = useTranslations("forms");
  const tCommon = useTranslations("common");
  const tTables = useTranslations("tables");
  const tModals = useTranslations("modals");
  const tErrors = useTranslations("errors");
  const [addModal, setAddModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SalaryRecord | null>(
    null
  );
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    staff: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    basicSalary: "",
    bonus: "0",
    deductions: "0",
    notes: "",
  });
  const [payAmount, setPayAmount] = useState("");

  const { data: staffList } = useSWR<Staff[]>("/api/shop/staff", fetcher);
  const { data: salaries, isLoading } = useSWR<SalaryRecord[]>(
    "/api/salary",
    fetcher
  );

  function openPayModal(record: SalaryRecord) {
    setSelectedRecord(record);
    setPayAmount("");
    setPayModal(true);
  }

  async function handleAddSalary(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/salary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          basicSalary: parseFloat(form.basicSalary),
          bonus: parseFloat(form.bonus),
          deductions: parseFloat(form.deductions),
        }),
      });
      if (res.ok) {
        setAddModal(false);
        setForm({
          staff: "",
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          basicSalary: "",
          bonus: "0",
          deductions: "0",
          notes: "",
        });
        mutate("/api/salary");
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || tErrors("errorAddingSalary"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRecord) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/salary/${selectedRecord._id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(payAmount) }),
      });
      if (res.ok) {
        setPayModal(false);
        mutate("/api/salary");
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || tErrors("errorRecordingPayment"));
      }
    } finally {
      setSaving(false);
    }
  }

  const monthKey = (m: number) => t(`month${m}` as "month1");
  const statusBadge = (status: SalaryRecord["status"]) => {
    const styles = {
      PENDING: "bg-amber-50 text-amber-700 border-amber-200",
      PARTIAL: "bg-blue-50 text-blue-700 border-blue-200",
      PAID: "bg-green-50 text-green-700 border-green-200",
    };
    return (
      <span
        className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  const columns = [
    {
      key: "staff",
      header: t("staff"),
      render: (r: SalaryRecord) =>
        typeof r.staff === "object" ? r.staff.name : r.staff,
    },
    {
      key: "period",
      header: t("monthYear"),
      render: (r: SalaryRecord) => `${monthKey(r.month)} ${r.year}`,
    },
    {
      key: "netSalary",
      header: t("net"),
      render: (r: SalaryRecord) => formatCurrency(r.netSalary),
    },
    {
      key: "totalPaid",
      header: t("paid"),
      render: (r: SalaryRecord) => formatCurrency(r.totalPaid),
    },
    {
      key: "status",
      header: t("status"),
      render: (r: SalaryRecord) => statusBadge(r.status),
    },
    {
      key: "action",
      header: t("action"),
      render: (r: SalaryRecord) =>
        r.status !== "PAID" ? (
          <Button size="sm" variant="outline" onClick={() => openPayModal(r)}>
            {t("pay")}
          </Button>
        ) : null,
    },
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("staffSalary")}>
        <Button onClick={() => setAddModal(true)}>
          <Plus size={16} className="mr-2" />
          {t("addSalaryRecord")}
        </Button>
      </PageHeader>

      <div className="px-6 pb-6">
        <DataTable
          columns={columns}
          data={salaries ?? []}
          emptyMessage={t("noSalaryRecords")}
        />
      </div>

      {/* Add Salary Record Modal */}
      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        title={t("addSalaryRecord")}
      >
        <form onSubmit={handleAddSalary} className="space-y-4">
          <div>
            <Label htmlFor="sal-staff">{t("staff")} *</Label>
            <select
              id="sal-staff"
              value={form.staff}
              onChange={(e) =>
                setForm((f) => ({ ...f, staff: e.target.value }))
              }
              required
              className="mt-1 flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">{t("selectStaff")}</option>
              {staffList?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sal-month">{t("month")} *</Label>
              <select
                id="sal-month"
                value={form.month}
                onChange={(e) =>
                  setForm((f) => ({ ...f, month: parseInt(e.target.value) }))
                }
                required
                className="mt-1 flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                  <option key={m} value={m}>
                    {monthKey(m)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="sal-year">{t("year")} *</Label>
              <Input
                id="sal-year"
                type="number"
                min="2020"
                max="2099"
                value={form.year}
                onChange={(e) =>
                  setForm((f) => ({ ...f, year: parseInt(e.target.value) }))
                }
                required
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="sal-basic">{t("basicSalary")} *</Label>
            <Input
              id="sal-basic"
              type="number"
              step="0.01"
              min="0"
              value={form.basicSalary}
              onChange={(e) =>
                setForm((f) => ({ ...f, basicSalary: e.target.value }))
              }
              required
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sal-bonus">{t("bonus")}</Label>
              <Input
                id="sal-bonus"
                type="number"
                step="0.01"
                min="0"
                value={form.bonus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bonus: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sal-deductions">{t("deductions")}</Label>
              <Input
                id="sal-deductions"
                type="number"
                step="0.01"
                min="0"
                value={form.deductions}
                onChange={(e) =>
                  setForm((f) => ({ ...f, deductions: e.target.value }))
                }
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="sal-notes">{t("notes")}</Label>
            <Input
              id="sal-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder={t("optionalNotes")}
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddModal(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? tCommon("saving") : tCommon("save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Pay Modal */}
      <Modal
        open={payModal}
        onClose={() => setPayModal(false)}
        title={tModals("recordPayment")}
      >
        {selectedRecord && (
          <form onSubmit={handlePay} className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-4 text-sm space-y-1">
              <p className="text-slate-500">
                {t("netSalary")}:{" "}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(selectedRecord.netSalary)}
                </span>
              </p>
              <p className="text-slate-500">
                {t("alreadyPaid")}:{" "}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(selectedRecord.totalPaid)}
                </span>
              </p>
              <p className="text-teal-700 font-medium">
                {t("remaining")}:{" "}
                {formatCurrency(
                  selectedRecord.netSalary - selectedRecord.totalPaid
                )}
              </p>
            </div>
            <div>
              <Label htmlFor="pay-amount">{t("paymentAmount")} *</Label>
              <Input
                id="pay-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={selectedRecord.netSalary - selectedRecord.totalPaid}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPayModal(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("processing") : tModals("recordPayment")}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
