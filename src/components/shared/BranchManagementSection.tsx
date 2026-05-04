"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus, Repeat, Save } from "lucide-react";
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
  const [modalOpen, setModalOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", address: "", phone: "", managerName: "", isDefault: false });
  const [transferForm, setTransferForm] = useState({ fromBranchId: "", toBranchId: "", imeis: "", notes: "" });
  const [saving, setSaving] = useState(false);

  async function saveBranch(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setModalOpen(false);
        setForm({ name: "", code: "", address: "", phone: "", managerName: "", isDefault: false });
        mutate("/api/branches");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to save branch");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleBranch(branch: Branch, patch: Partial<Branch>) {
    const res = await fetch(`/api/branches/${branch._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) mutate("/api/branches");
  }

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
      <PageHeader title="Branches" description="Manage shop branches and transfer IMEI stock between them.">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <Repeat size={16} className="mr-1.5" />
            Transfer IMEI
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            Add Branch
          </Button>
        </div>
      </PageHeader>

      <div className="px-6 pb-6 space-y-6">
        <DataTable
          columns={[
            { key: "name", header: "Branch" },
            { key: "code", header: "Code" },
            { key: "managerName", header: "Manager", render: (b: Branch) => b.managerName || "-" },
            { key: "phone", header: "Phone", render: (b: Branch) => b.phone || "-" },
            { key: "isDefault", header: "Default", render: (b: Branch) => b.isDefault ? "Yes" : <Button size="sm" variant="ghost" onClick={() => toggleBranch(b, { isDefault: true })}>Set</Button> },
            { key: "isActive", header: "Status", render: (b: Branch) => (
              <Button size="sm" variant="ghost" onClick={() => toggleBranch(b, { isActive: b.isActive === false })}>
                {b.isActive === false ? "Inactive" : "Active"}
              </Button>
            ) },
          ]}
          data={branches ?? []}
          emptyMessage="No branches yet."
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Branch">
        <form onSubmit={saveBranch} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required /></div>
            <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="MAIN" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>Manager</Label><Input value={form.managerName} onChange={(e) => setForm((f) => ({ ...f, managerName: e.target.value }))} /></div>
            <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} /> Default branch</label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}><Save size={16} className="mr-1.5" />Save</Button>
          </div>
        </form>
      </Modal>

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
