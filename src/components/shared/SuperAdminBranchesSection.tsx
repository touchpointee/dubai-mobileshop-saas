"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";

type ShopRef = { _id: string; name: string; slug?: string };
type Shop = { _id: string; name: string; slug: string };
type Branch = {
  _id: string;
  shopId?: ShopRef | string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  managerName?: string;
  isDefault?: boolean;
  isActive?: boolean;
};

type BranchForm = {
  shopId: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  managerName: string;
  isDefault: boolean;
  isActive: boolean;
};

const API_BRANCHES = "/api/super-admin/branches";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

const emptyForm: BranchForm = {
  shopId: "",
  name: "",
  code: "",
  address: "",
  phone: "",
  managerName: "",
  isDefault: false,
  isActive: true,
};

function getShopName(branch: Branch) {
  if (!branch.shopId) return "-";
  if (typeof branch.shopId === "string") return branch.shopId;
  return branch.shopId.name;
}

export function SuperAdminBranchesSection({ shops }: { shops: Shop[] }) {
  const { data: branches } = useSWR<Branch[]>(API_BRANCHES, fetcher);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const shopOptions = useMemo(() => shops ?? [], [shops]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, shopId: shopOptions[0]?._id ?? "" });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (branch: Branch) => {
    const shopId = branch.shopId && typeof branch.shopId === "object" ? branch.shopId._id : String(branch.shopId ?? "");
    setEditing(branch);
    setForm({
      shopId,
      name: branch.name,
      code: branch.code,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      managerName: branch.managerName ?? "",
      isDefault: branch.isDefault === true,
      isActive: branch.isActive !== false,
    });
    setError("");
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `${API_BRANCHES}/${editing._id}` : API_BRANCHES;
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save branch");
      await mutate(API_BRANCHES);
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save branch");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: "shopId", header: "Shop", render: (b: Branch) => getShopName(b) },
    { key: "name", header: "Branch" },
    { key: "code", header: "Code" },
    { key: "managerName", header: "Manager", render: (b: Branch) => b.managerName || "-" },
    { key: "phone", header: "Phone", render: (b: Branch) => b.phone || "-" },
    { key: "isDefault", header: "Default", render: (b: Branch) => (b.isDefault ? "Yes" : "-") },
    { key: "isActive", header: "Status", render: (b: Branch) => (b.isActive === false ? "Inactive" : "Active") },
    {
      key: "actions",
      header: "Actions",
      render: (b: Branch) => (
        <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
          <Pencil size={15} />
        </Button>
      ),
    },
  ];

  return (
    <section className="px-6 pb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Branches</h2>
          <p className="text-sm text-slate-500">Create branches here, then assign users to a branch from Super Admin users.</p>
        </div>
        <Button onClick={openAdd} disabled={shopOptions.length === 0}>
          <Plus size={16} className="mr-1.5" />
          Add Branch
        </Button>
      </div>

      <DataTable columns={columns} data={branches ?? []} emptyMessage="No branches yet." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Branch" : "Add Branch"} size="lg">
        <form onSubmit={save} className="space-y-4">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            {!editing && (
              <div className="space-y-1.5">
                <Label>Shop *</Label>
                <select className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm" value={form.shopId} onChange={(e) => setForm((f) => ({ ...f, shopId: e.target.value }))} required>
                  <option value="">Select shop</option>
                  {shopOptions.map((shop) => <option key={shop._id} value={shop._id}>{shop.name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="MAIN" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Manager</Label>
              <Input value={form.managerName} onChange={(e) => setForm((f) => ({ ...f, managerName: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
              Default branch
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
              Active
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Branch"}</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
