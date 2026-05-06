"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Repeat } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/data-table";

type Branch = {
  _id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  managerName?: string;
  isDefault?: boolean;
  isActive?: boolean;
};

type Transfer = {
  _id: string;
  transferNumber: string;
  fromBranchId?: { name?: string; code?: string };
  toBranchId?: { name?: string; code?: string };
  items: { imei?: string; productName?: string }[];
  transferDate: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function BranchManagementSection() {
  const { data: branches } = useSWR<Branch[]>("/api/branches", fetcher);
  const { data: transfers } = useSWR<Transfer[]>("/api/stock-transfers", fetcher);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromBranchId: "", toBranchId: "", imeis: "", notes: "" });
  const [saving, setSaving] = useState(false);

  async function submitTransfer(e: React.FormEvent) {
    e.preventDefault();
    const imeiValues = transferForm.imeis.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    if (!transferForm.fromBranchId || !transferForm.toBranchId || imeiValues.length === 0) return;
    setSaving(true);
    try {
      const params = new URLSearchParams({ branchId: transferForm.fromBranchId });
      const imeiIds: string[] = [];
      for (const value of imeiValues) {
        const lookup = await fetch(`/api/products/lookup?code=${encodeURIComponent(value)}&${params}`);
        if (lookup.ok) {
          const data = await lookup.json();
          if (data.type === "imei" && data.imeiId) imeiIds.push(data.imeiId);
        }
      }
      if (imeiIds.length !== imeiValues.length) {
        alert("Some IMEIs were not found in the source branch.");
        return;
      }
      const res = await fetch("/api/stock-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...transferForm, imeiIds }),
      });
      if (res.ok) {
        setTransferOpen(false);
        setTransferForm({ fromBranchId: "", toBranchId: "", imeis: "", notes: "" });
        mutate("/api/stock-transfers");
        mutate("/api/products");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to transfer stock");
      }
    } finally {
      setSaving(false);
    }
  }

  const activeBranches = (branches ?? []).filter((b) => b.isActive !== false);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Branches" description="Branches are created by super admin. Main shop admins can transfer stock between assigned branches.">
        <Button variant="outline" onClick={() => setTransferOpen(true)} disabled={activeBranches.length < 2}>
          <Repeat size={16} className="mr-1.5" />
          Transfer IMEI
        </Button>
      </PageHeader>

      <div className="px-6 pb-6 space-y-6">
        <DataTable
          columns={[
            { key: "name", header: "Branch" },
            { key: "code", header: "Code" },
            { key: "managerName", header: "Manager", render: (b: Branch) => b.managerName || "-" },
            { key: "phone", header: "Phone", render: (b: Branch) => b.phone || "-" },
            { key: "isDefault", header: "Default", render: (b: Branch) => b.isDefault ? "Yes" : "-" },
            { key: "isActive", header: "Status", render: (b: Branch) => b.isActive === false ? "Inactive" : "Active" },
          ]}
          data={branches ?? []}
          emptyMessage="No branches assigned yet."
        />

        <section>
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Recent transfers</h3>
          <DataTable
            columns={[
              { key: "transferNumber", header: "Transfer" },
              { key: "fromBranchId", header: "From", render: (t: Transfer) => t.fromBranchId?.name ?? "-" },
              { key: "toBranchId", header: "To", render: (t: Transfer) => t.toBranchId?.name ?? "-" },
              { key: "items", header: "IMEIs", render: (t: Transfer) => String(t.items?.length ?? 0) },
              { key: "transferDate", header: "Date", render: (t: Transfer) => new Date(t.transferDate).toLocaleDateString("en-AE") },
            ]}
            data={transfers ?? []}
            emptyMessage="No transfers yet."
          />
        </section>
      </div>

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="Transfer IMEI Stock">
        <form onSubmit={submitTransfer} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>From branch</Label>
              <select className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3" value={transferForm.fromBranchId} onChange={(e) => setTransferForm((f) => ({ ...f, fromBranchId: e.target.value }))}>
                <option value="">Select</option>
                {activeBranches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <Label>To branch</Label>
              <select className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3" value={transferForm.toBranchId} onChange={(e) => setTransferForm((f) => ({ ...f, toBranchId: e.target.value }))}>
                <option value="">Select</option>
                {activeBranches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>IMEIs</Label>
            <textarea className="mt-1.5 min-h-32 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={transferForm.imeis} onChange={(e) => setTransferForm((f) => ({ ...f, imeis: e.target.value }))} placeholder="Paste one IMEI per line" />
          </div>
          <div><Label>Notes</Label><Input value={transferForm.notes} onChange={(e) => setTransferForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>Transfer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
