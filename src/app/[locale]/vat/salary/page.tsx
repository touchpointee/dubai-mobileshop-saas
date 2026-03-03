"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
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

type StaffRow = {
  _id: string;
  name: string;
  phone?: string;
  isActive: boolean;
  totalPaid: number;
};

export default function SalaryPage() {
  const t = useTranslations("pages");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [addModal, setAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });

  const { data: staffList, isLoading } = useSWR<StaffRow[]>("/api/staff", fetcher);

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim() || undefined }),
      });
      if (res.ok) {
        setAddModal(false);
        setForm({ name: "", phone: "" });
        mutate("/api/staff");
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || tErrors("errorAddingStaff"));
      }
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: "name",
      header: t("staff"),
      render: (r: StaffRow) => r.name,
    },
    {
      key: "phone",
      header: t("phone"),
      render: (r: StaffRow) => r.phone || "—",
    },
    {
      key: "totalPaid",
      header: t("totalPaid"),
      render: (r: StaffRow) => formatCurrency(r.totalPaid),
    },
    {
      key: "action",
      header: t("action"),
      render: (r: StaffRow) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(ev) => {
            ev.stopPropagation();
            router.push(`/vat/salary/${r._id}`);
          }}
        >
          {t("viewDetail")}
        </Button>
      ),
    },
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("staffSalary")}>
        <Button onClick={() => setAddModal(true)}>
          <Plus size={16} className="mr-2" />
          {t("addStaff")}
        </Button>
      </PageHeader>

      <div className="px-6 pb-6">
        <DataTable
          columns={columns}
          data={staffList ?? []}
          emptyMessage={t("noStaffYet")}
          onRowClick={(row) => router.push(`/vat/salary/${row._id}`)}
        />
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title={t("addStaff")}>
        <form onSubmit={handleAddStaff} className="space-y-4">
          <div>
            <Label htmlFor="staff-name">{t("staff")} *</Label>
            <Input
              id="staff-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t("staffNamePlaceholder")}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="staff-phone">{t("phone")}</Label>
            <Input
              id="staff-phone"
              type="text"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder={t("phoneOptional")}
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
