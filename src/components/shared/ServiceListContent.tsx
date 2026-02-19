"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { PageSkeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

type ServiceJob = {
  _id: string;
  customerName: string;
  customerPhone?: string;
  deviceDescription: string;
  status: string;
  proposedPrice?: number;
  finalCharge?: number;
  createdAt: string;
};

type Customer = { _id: string; name: string; phone?: string };

const SWR_KEY = "/api/service-jobs";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ServiceListContent() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const basePath = pathname?.replace(/\/service.*$/, "") || `/${locale}/vat`;
  const { data: jobs, isLoading } = useSWR<ServiceJob[]>(SWR_KEY, fetcher);
  const { data: customers } = useSWR<Customer[]>("/api/customers", fetcher);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    customerId: "",
    customerName: "",
    customerPhone: "",
    deviceDescription: "",
    deviceCondition: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  function openNew() {
    setForm({
      customerId: "",
      customerName: "",
      customerPhone: "",
      deviceDescription: "",
      deviceCondition: "",
      notes: "",
    });
    setModalOpen(true);
  }

  function onSelectCustomer(id: string) {
    const c = customers?.find((x) => x._id === id);
    if (c) setForm((f) => ({ ...f, customerId: id, customerName: c.name, customerPhone: c.phone ?? "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customerName.trim() || !form.deviceDescription.trim()) {
      alert("Customer name and device description are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/service-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: form.customerId || undefined,
          customerName: form.customerName.trim(),
          customerPhone: form.customerPhone?.trim(),
          deviceDescription: form.deviceDescription.trim(),
          deviceCondition: form.deviceCondition?.trim(),
          notes: form.notes?.trim(),
        }),
      });
      if (res.ok) {
        const job = await res.json();
        setModalOpen(false);
        mutate(SWR_KEY);
        router.push(`${basePath}/service/${job._id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Error creating job");
      }
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <PageSkeleton />;

  const columns = [
    { key: "customerName", header: "Customer" },
    {
      key: "deviceDescription",
      header: "Device",
      render: (j: ServiceJob) => <span className="text-slate-700">{j.deviceDescription}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (j: ServiceJob) => (
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
          {j.status.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "proposedPrice",
      header: "Proposed",
      render: (j: ServiceJob) => (j.proposedPrice != null ? formatCurrency(j.proposedPrice) : "—"),
    },
    {
      key: "finalCharge",
      header: "Final",
      render: (j: ServiceJob) => (j.finalCharge != null ? formatCurrency(j.finalCharge) : "—"),
    },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (j: ServiceJob) => (
        <Link href={`${basePath}/service/${j._id}`}>
          <Button variant="outline" size="sm">Open</Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title="Service" description="Repair jobs and service orders">
        <Button onClick={openNew}>
          <Plus size={16} className="mr-1.5" />
          New Job
        </Button>
      </PageHeader>

      <div className="px-6 pb-6">
        <DataTable columns={columns} data={jobs ?? []} emptyMessage="No service jobs yet. Create one to get started." />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Service Job">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Customer</Label>
            <select
              value={form.customerId}
              onChange={(e) => onSelectCustomer(e.target.value)}
              className="mt-1.5 flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Select or type below —</option>
              {(customers ?? []).map((c) => (
                <option key={c._id} value={c._id}>{c.name}{c.phone ? ` — ${c.phone}` : ""}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Customer name *</Label>
              <Input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Device description *</Label>
            <Input value={form.deviceDescription} onChange={(e) => setForm((f) => ({ ...f, deviceDescription: e.target.value }))} placeholder="e.g. iPhone 14, screen cracked" required />
          </div>
          <div>
            <Label>Device condition</Label>
            <Input value={form.deviceCondition} onChange={(e) => setForm((f) => ({ ...f, deviceCondition: e.target.value }))} />
          </div>
          <div>
            <Label>Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create Job"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
