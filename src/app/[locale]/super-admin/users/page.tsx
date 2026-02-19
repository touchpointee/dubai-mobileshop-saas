"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import useSWR, { mutate } from "swr";
import { Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageSkeleton } from "@/components/ui/skeleton";
import { ROLES } from "@/lib/constants";

type ShopRef = { _id: string; name: string; slug: string };

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  shopId?: ShopRef | string | null;
  isActive: boolean;
};

type Shop = { _id: string; name: string; slug: string };

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: string;
  shopId: string;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const API_USERS = "/api/super-admin/users";
const API_SHOPS = "/api/super-admin/shops";

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-slate-100 text-slate-700",
  OWNER: "bg-teal-50 text-teal-700",
  VAT_STAFF: "bg-blue-50 text-blue-700",
  NON_VAT_STAFF: "bg-amber-50 text-amber-700",
  STAFF: "bg-emerald-50 text-emerald-700",
};

const emptyForm: UserForm = {
  name: "",
  email: "",
  password: "",
  role: "OWNER",
  shopId: "",
};

function getShopName(user: User): string {
  if (!user.shopId) return "—";
  if (typeof user.shopId === "string") return user.shopId;
  return user.shopId.name;
}

export default function UsersPage() {
  const t = useTranslations("pages");
  const tForms = useTranslations("forms");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tRoleLabels = useTranslations("roleLabels");
  const { data: users, isLoading: loadingUsers } = useSWR<User[]>(API_USERS, fetcher);
  const { data: shops, isLoading: loadingShops } = useSWR<Shop[]>(API_SHOPS, fetcher);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      shopId:
        user.shopId && typeof user.shopId === "object"
          ? user.shopId._id
          : (user.shopId as string) || "",
    });
    setError("");
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const url = editing ? `${API_USERS}/${editing._id}` : API_USERS;
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        shopId: form.role === "SUPER_ADMIN" ? undefined : form.shopId || undefined,
      };
      if (form.password) payload.password = form.password;
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tErrors("failedToSaveUser"));
      await mutate(API_USERS);
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tErrors("somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: User) => {
    await fetch(`${API_USERS}/${user._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    await mutate(API_USERS);
  };

  if (loadingUsers || loadingShops) return <PageSkeleton />;

  const columns = [
    { key: "name", header: tForms("name") },
    { key: "email", header: tForms("email") },
    {
      key: "role",
      header: t("role"),
      render: (user: User) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
            ROLE_COLORS[user.role] || "bg-slate-100 text-slate-600"
          }`}
        >
          {(tRoleLabels as (k: string) => string)(user.role) || user.role}
        </span>
      ),
    },
    {
      key: "shopId",
      header: t("shop"),
      render: (user: User) => (
        <span className="text-slate-600">{getShopName(user)}</span>
      ),
    },
    {
      key: "isActive",
      header: t("status"),
      render: (user: User) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            user.isActive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {user.isActive ? t("active") : t("inactive")}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("actions"),
      render: (user: User) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
            <Pencil size={15} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleActive(user)}
            className={user.isActive ? "text-red-500 hover:text-red-600" : "text-emerald-600 hover:text-emerald-700"}
          >
            {user.isActive ? t("disable") : t("enable")}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <PageHeader title={t("users")} description={t("usersRegistered", { count: users?.length ?? 0 })}>
        <Button onClick={openAdd}>
          <Plus size={16} className="mr-1.5" />
          {t("addUser")}
        </Button>
      </PageHeader>

      <div className="px-6 pb-6">
        <DataTable columns={columns} data={users ?? []} emptyMessage={t("emptyUsers")} />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t("editUser") : t("addUserModal")}
        size="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className="space-y-4"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("fullName")} *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder={t("fullNamePlaceholder")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">{tForms("email")} *</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder={t("emailPlaceholder")}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">
              {editing ? t("passwordLeaveBlank") : `${tCommon("password")} *`}
            </Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder={editing ? "••••••••" : t("passwordPlaceholder")}
              required={!editing}
              minLength={6}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="role">{t("role")} *</Label>
              <select
                id="role"
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {(tRoleLabels as (k: string) => string)(role) || role}
                  </option>
                ))}
              </select>
            </div>
            {form.role !== "SUPER_ADMIN" && (
              <div className="space-y-1.5">
                <Label htmlFor="shopId">{t("shop")} *</Label>
                <select
                  id="shopId"
                  value={form.shopId}
                  onChange={(e) => setForm((p) => ({ ...p, shopId: e.target.value }))}
                  className="flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
                  required
                >
                  <option value="">{t("selectShop")}</option>
                  {(shops ?? []).map((shop) => (
                    <option key={shop._id} value={shop._id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? tCommon("saving") : editing ? t("updateUser") : t("createUser")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
