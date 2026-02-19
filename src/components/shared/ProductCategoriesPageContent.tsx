"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { PageSkeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProductCategory = {
  _id: string;
  name: string;
  nameAr?: string;
  sortOrder: number;
};

const SWR_KEY = "/api/product-categories";
const fetcher = (url: string) => fetch(url).then((r) => r.json());

const emptyForm = { name: "", nameAr: "", sortOrder: 0 };

export function ProductCategoriesPageContent() {
  const { data: categories, isLoading } = useSWR<ProductCategory[]>(SWR_KEY, fetcher);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(c: ProductCategory) {
    setEditing(c);
    setForm({
      name: c.name,
      nameAr: c.nameAr ?? "",
      sortOrder: c.sortOrder ?? 0,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/product-categories/${editing._id}` : "/api/product-categories";
      const method = editing ? "PUT" : "POST";
      const payload = editing
        ? { ...form, sortOrder: Number(form.sortOrder) }
        : { name: form.name.trim(), nameAr: form.nameAr?.trim() || undefined, sortOrder: Number(form.sortOrder) };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setModalOpen(false);
        mutate(SWR_KEY);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Error saving category");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this category? Products using it will keep the reference.")) return;
    const res = await fetch(`/api/product-categories/${id}`, { method: "DELETE" });
    if (res.ok) mutate(SWR_KEY);
  }

  if (isLoading) return <PageSkeleton />;

  const columns = [
    { key: "name", header: "Name" },
    {
      key: "nameAr",
      header: "Name (Arabic)",
      render: (c: ProductCategory) => <span className="text-slate-500">{c.nameAr || "—"}</span>,
    },
    {
      key: "sortOrder",
      header: "Order",
      render: (c: ProductCategory) => <span className="text-slate-500">{c.sortOrder}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-36",
      render: (c: ProductCategory) => (
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
      <PageHeader title="Categories" description="Product categories shared across VAT and Non-VAT">
        <Button onClick={openAdd}>
          <Plus size={16} className="mr-1.5" />
          Add Category
        </Button>
      </PageHeader>

      <div className="px-6 pb-6">
        <DataTable columns={columns} data={categories ?? []} emptyMessage="No categories yet. Add one to organize products." />
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Category" : "Add Category"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cat-name">Name *</Label>
              <Input id="cat-name" className="mt-1.5" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="cat-nameAr">Name (Arabic)</Label>
              <Input id="cat-nameAr" className="mt-1.5" value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="cat-sortOrder">Sort order</Label>
              <Input id="cat-sortOrder" className="mt-1.5" type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
