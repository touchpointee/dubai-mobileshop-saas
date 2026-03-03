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
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, FolderOpen } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Category = { _id: string; name: string };
type Expense = {
  _id: string;
  date: string;
  category: Category | string;
  description: string;
  amount: number;
  createdBy?: { name?: string };
};

export default function ExpensesPage() {
  const t = useTranslations("pages");
  const tForms = useTranslations("forms");
  const tCommon = useTranslations("common");
  const tTables = useTranslations("tables");
  const tErrors = useTranslations("errors");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const [expenseModal, setExpenseModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    category: "",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [categoryName, setCategoryName] = useState("");

  const { data: categories } = useSWR<Category[]>(
    "/api/expense-categories",
    fetcher
  );
  const { data: expenses, isLoading } = useSWR<Expense[]>(
    `/api/expenses?from=${from}&to=${to}`,
    fetcher
  );

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...expenseForm,
          amount: parseFloat(expenseForm.amount),
        }),
      });
      if (res.ok) {
        setExpenseModal(false);
        setExpenseForm({
          category: "",
          description: "",
          amount: "",
          date: new Date().toISOString().slice(0, 10),
        });
        mutate(`/api/expenses?from=${from}&to=${to}`);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || tErrors("errorAddingExpense"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/expense-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName }),
      });
      if (res.ok) {
        setCategoryName("");
        mutate("/api/expense-categories");
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || tErrors("errorAddingCategory"));
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm(tErrors("deleteCategoryConfirm"))) return;
    const res = await fetch(`/api/expense-categories/${id}`, {
      method: "DELETE",
    });
    if (res.ok) mutate("/api/expense-categories");
  }

  const columns = [
    {
      key: "date",
      header: tForms("date"),
      render: (r: Expense) => formatDate(r.date),
    },
    {
      key: "category",
      header: tTables("category"),
      render: (r: Expense) =>
        typeof r.category === "object" ? r.category.name : r.category,
    },
    { key: "description", header: tForms("description") },
    {
      key: "amount",
      header: tForms("amount"),
      render: (r: Expense) => formatCurrency(r.amount),
    },
    {
      key: "createdBy",
      header: tTables("by"),
      render: (r: Expense) => r.createdBy?.name ?? "—",
    },
  ];

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("expenses")}>
        <Button variant="outline" onClick={() => setCategoryModal(true)}>
          <FolderOpen size={16} className="mr-2" />
          {t("categories")}
        </Button>
        <Button onClick={() => setExpenseModal(true)}>
          <Plus size={16} className="mr-2" />
          {t("addExpense")}
        </Button>
      </PageHeader>

      <div className="px-6 pb-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="mb-1 block text-xs text-slate-500">{t("from")}</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label className="mb-1 block text-xs text-slate-500">{t("to")}</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-40"
            />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={expenses ?? []}
          emptyMessage={t("noExpensesInRange")}
        />
      </div>

      {/* Add Expense Modal */}
      <Modal
        open={expenseModal}
        onClose={() => setExpenseModal(false)}
        title={t("addExpense")}
      >
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <Label htmlFor="exp-category">{tTables("category")} *</Label>
            <select
              id="exp-category"
              value={expenseForm.category}
              onChange={(e) =>
                setExpenseForm((f) => ({ ...f, category: e.target.value }))
              }
              required
              className="mt-1 flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">{tForms("selectCategory")}</option>
              {categories?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="exp-desc">{tForms("description")}</Label>
            <Input
              id="exp-desc"
              value={expenseForm.description}
              onChange={(e) =>
                setExpenseForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder={t("expenseDescriptionPlaceholder")}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="exp-amount">{tForms("amount")} *</Label>
            <Input
              id="exp-amount"
              type="number"
              step="0.01"
              min="0"
              value={expenseForm.amount}
              onChange={(e) =>
                setExpenseForm((f) => ({ ...f, amount: e.target.value }))
              }
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="exp-date">{tForms("date")} *</Label>
            <Input
              id="exp-date"
              type="date"
              value={expenseForm.date}
              onChange={(e) =>
                setExpenseForm((f) => ({ ...f, date: e.target.value }))
              }
              required
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setExpenseModal(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? tCommon("saving") : tCommon("save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        open={categoryModal}
        onClose={() => setCategoryModal(false)}
        title={t("expenseCategories")}
      >
        <div className="space-y-4">
          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {categories?.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">
                {t("noCategoriesYet")}
              </p>
            )}
            {categories?.map((c) => (
              <div
                key={c._id}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <span className="text-sm text-slate-700">{c.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDeleteCategory(c._id)}
                >
                  {tCommon("delete")}
                </Button>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleAddCategory}
            className="flex items-end gap-2"
          >
            <div className="flex-1">
              <Label htmlFor="cat-name">{t("newCategory")}</Label>
              <Input
                id="cat-name"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder={t("categoryPlaceholder")}
                required
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={saving}>
              {tCommon("add")}
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
