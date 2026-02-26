"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import useSWR, { mutate } from "swr";
import { swrFetcher } from "@/lib/swr-fetcher";
import { Plus, Pencil, Trash2, ChevronRight, ArrowLeft } from "lucide-react";
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
  nameAr?: string | null;
  sortOrder: number;
  parentId?: string | null;
  parentName?: string | null;
};

const SWR_KEY = "/api/product-categories";

const emptyForm = { name: "", nameAr: "", sortOrder: 0, parentId: "" };

export function ProductCategoriesPageContent() {
  const t = useTranslations("pages");
  const { data: categories, isLoading } = useSWR<ProductCategory[]>(SWR_KEY, swrFetcher);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  /** Breadcrumb of category ids we've drilled through. Empty when viewing top-level or direct children of a top-level category. */
  const [breadcrumbIds, setBreadcrumbIds] = useState<string[]>([]);
  /** When adding: parent id for subcategory, or null for top-level. Not used when editing. */
  const [addParentId, setAddParentId] = useState<string | null>(null);

  const topLevelCategories = (categories ?? []).filter((c) => !c.parentId || c.parentId === "");
  const selectedCategory = selectedCategoryId ? (categories ?? []).find((c) => String(c._id) === String(selectedCategoryId)) : null;
  const subcategoriesOfSelected = (categories ?? []).filter((c) => String(c.parentId ?? "") === String(selectedCategoryId ?? ""));

  /** Get path of category ids from root to the given category (inclusive). */
  function getPathFromRoot(catId: string): string[] {
    const list = categories ?? [];
    const byId = new Map<string, ProductCategory>();
    for (const c of list) byId.set(String(c._id), c);
    const path: string[] = [];
    let currentId: string | null = catId;
    const seen = new Set<string>();
    while (currentId && !seen.has(currentId)) {
      seen.add(currentId);
      const node = byId.get(currentId);
      if (!node) break;
      path.unshift(currentId);
      currentId = node.parentId ? String(node.parentId) : null;
    }
    return path;
  }

  /** Get all descendant category ids (recursive). */
  function getDescendantIds(catId: string): Set<string> {
    const list = categories ?? [];
    const descendants = new Set<string>();
    let layer = list.filter((c) => String(c.parentId ?? "") === String(catId)).map((c) => c._id);
    while (layer.length) {
      for (const id of layer) {
        descendants.add(String(id));
      }
      layer = list.filter((c) => layer.some((id) => String(id) === String(c.parentId ?? ""))).map((c) => c._id);
    }
    return descendants;
  }

  function handleBack() {
    if (breadcrumbIds.length > 0) {
      const next = [...breadcrumbIds];
      const popped = next.pop();
      setBreadcrumbIds(next);
      setSelectedCategoryId(popped ?? null);
    } else {
      setSelectedCategoryId(null);
    }
  }

  function drillInto(c: ProductCategory) {
    if (!selectedCategoryId) return;
    setBreadcrumbIds((prev) => [...prev, selectedCategoryId]);
    setSelectedCategoryId(c._id);
  }

  function openAdd(parentId?: string) {
    setEditing(null);
    setAddParentId(parentId ? String(parentId).trim() || null : null);
    setForm({ ...emptyForm, parentId: "" });
    setModalOpen(true);
  }

  function openEdit(c: ProductCategory) {
    setEditing(c);
    setAddParentId(null);
    setForm({
      name: c.name,
      nameAr: c.nameAr ?? "",
      sortOrder: c.sortOrder ?? 0,
      parentId: c.parentId ?? "",
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/product-categories/${editing._id}` : "/api/product-categories";
      const method = editing ? "PUT" : "POST";
      const body: Record<string, unknown> = editing
        ? {
            name: form.name.trim(),
            nameAr: form.nameAr?.trim() || undefined,
            sortOrder: Number(form.sortOrder),
            parentId: form.parentId?.trim() || null,
          }
        : {
            name: form.name.trim(),
            nameAr: form.nameAr?.trim() || undefined,
            sortOrder: Number(form.sortOrder),
            parentId: addParentId?.trim() || undefined,
          };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setAddParentId(null);
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
    const data = await res.json().catch(() => ({}));
    if (res.ok) mutate(SWR_KEY);
    else alert(data.error || "Error deleting category");
  }

  if (isLoading) return <PageSkeleton />;

  const categoryListColumns = [
    {
      key: "name",
      header: "Name",
      render: (c: ProductCategory) => (
        <button
          type="button"
          onClick={() => setSelectedCategoryId(String(c._id))}
          className="flex w-full items-center gap-2 text-left font-medium text-teal-600 hover:text-teal-700 hover:underline"
        >
          {c.name}
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      ),
    },
    {
      key: "nameAr",
      header: "Name (Arabic)",
      render: (c: ProductCategory) => <span className="text-slate-500">{c.nameAr || "—"}</span>,
    },
    {
      key: "subcount",
      header: t("subcategory"),
      render: (c: ProductCategory) => {
        const count = (categories ?? []).filter((x) => String(x.parentId) === String(c._id)).length;
        return <span className="text-slate-500">{count}</span>;
      },
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

  const subcategoryListColumns = [
    {
      key: "name",
      header: "Name",
      render: (c: ProductCategory) => (
        <button
          type="button"
          onClick={() => drillInto(c)}
          className="flex w-full items-center gap-2 text-left font-medium text-teal-600 hover:text-teal-700 hover:underline"
          title="Open to view or add subcategories"
        >
          {c.name}
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      ),
    },
    { key: "nameAr", header: "Name (Arabic)", render: (c: ProductCategory) => <span className="text-slate-500">{c.nameAr || "—"}</span> },
    { key: "sortOrder", header: "Order", render: (c: ProductCategory) => <span className="text-slate-500">{c.sortOrder}</span> },
    {
      key: "actions",
      header: "Actions",
      className: "w-28",
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
      {selectedCategoryId && selectedCategory ? (
        <>
          <PageHeader
            title={selectedCategory.name}
            description={
              breadcrumbIds.length > 0
                ? `Categories › ${[...breadcrumbIds, selectedCategoryId].map((id) => (categories ?? []).find((c) => String(c._id) === id)?.name ?? id).join(" › ")}`
                : selectedCategory.nameAr
                  ? `${t("subcategory")} — ${selectedCategory.nameAr}`
                  : t("subcategory")
            }
          >
            <Button variant="outline" onClick={handleBack}>
              <ArrowLeft size={16} className="mr-1.5" />
              {breadcrumbIds.length > 0 ? t("backToCategories") : t("backToCategories")}
            </Button>
            <Button onClick={() => openAdd(selectedCategoryId ? String(selectedCategoryId) : undefined)}>
              <Plus size={16} className="mr-1.5" />
              {t("addSubcategory")}
            </Button>
          </PageHeader>
          <div className="px-6 pb-6">
            <DataTable
              columns={subcategoryListColumns}
              data={subcategoriesOfSelected}
              emptyMessage="No subcategories yet. Click Add subcategory to add one."
            />
          </div>
        </>
      ) : (
        <>
          <PageHeader title="Categories" description="Click a category to view and manage its subcategories.">
            <Button onClick={() => openAdd()}>
              <Plus size={16} className="mr-1.5" />
              {t("addCategory")}
            </Button>
          </PageHeader>
          <div className="px-6 pb-6">
            <DataTable
              columns={categoryListColumns}
              data={topLevelCategories}
              emptyMessage="No categories yet. Add one to organize products."
            />
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Category" : addParentId ? t("addSubcategory") : t("addCategory")}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {editing ? (
              <div className="sm:col-span-2">
                <Label htmlFor="cat-parent">{t("parentCategory")}</Label>
                <select
                  id="cat-parent"
                  className="mt-1.5 flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={form.parentId ? String(form.parentId) : ""}
                  onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value || "" }))}
                >
                  <option value="">Top-level (no parent)</option>
                  {(() => {
                    const list = categories ?? [];
                    const excluded = new Set([String(editing._id), ...getDescendantIds(editing._id)]);
                    const withDepth = list
                      .filter((c) => !excluded.has(String(c._id)))
                      .map((c) => ({ c, path: getPathFromRoot(c._id), depth: getPathFromRoot(c._id).length - 1 }));
                    withDepth.sort((a, b) => {
                      const pathA = a.path.join("\0");
                      const pathB = b.path.join("\0");
                      return pathA.localeCompare(pathB) || a.c.name.localeCompare(b.c.name);
                    });
                    return withDepth.map(({ c, depth }) => (
                      <option key={String(c._id)} value={String(c._id)}>
                        {"\u00A0".repeat(Math.max(0, depth * 2))}{c.name}
                      </option>
                    ));
                  })()}
                </select>
              </div>
            ) : addParentId ? (
              <div className="sm:col-span-2">
                <Label>{t("parentCategory")}</Label>
                <p className="mt-1.5 text-sm text-slate-600">
                  {selectedCategory?.name ?? addParentId}
                </p>
              </div>
            ) : null}
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
