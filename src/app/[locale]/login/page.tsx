"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, getSession, getCsrfToken } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { ROLE_DEFAULT_PATH } from "@/lib/role-routes";
import type { Role } from "@/lib/constants";

function getContext(): { type: "admin" | "shop" | "landing"; slug?: string } {
  if (typeof window === "undefined") return { type: "landing" };
  const hostname = window.location.hostname;

  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000").split(":")[0];

  if (rootDomain === "localhost") {
    const match = hostname.match(/^(.+)\.localhost$/);
    if (match) {
      if (match[1] === "admin") return { type: "admin" };
      return { type: "shop", slug: match[1] };
    }
    return { type: "landing" };
  }

  const rootParts = rootDomain.split(".");
  const hostParts = hostname.split(".");
  if (hostParts.length > rootParts.length) {
    const sub = hostParts.slice(0, hostParts.length - rootParts.length).join(".");
    if (sub === "admin") return { type: "admin" };
    return { type: "shop", slug: sub };
  }
  return { type: "landing" };
}

type ShopInfo = { name: string; nameAr?: string; logo?: string; slug: string };

function LoginForm() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [ctx, setCtx] = useState<{ type: "admin" | "shop" | "landing"; slug?: string }>({ type: "landing" });
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    const c = getContext();
    setCtx(c);
    getCsrfToken().then((token) => token && setCsrfToken(token));
    if (c.type === "shop" && c.slug) {
      fetch(`/api/shop-info?slug=${encodeURIComponent(c.slug)}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => data && setShopInfo(data))
        .catch(() => {});
    }
  }, []);

  function getCallbackDefault() {
    if (ctx.type === "admin") return "/super-admin/dashboard";
    return "/";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let context = "";
      if (ctx.type === "admin") context = "admin";
      else if (ctx.type === "shop" && ctx.slug) context = `shop:${ctx.slug}`;

      const token = csrfToken ?? (await getCsrfToken());
      const res = await signIn("credentials", {
        email,
        password,
        context,
        redirect: false,
        csrfToken: token ?? undefined,
      });
      if (res?.error) {
        setError(ctx.type === "admin"
          ? "Invalid credentials or not a system admin"
          : ctx.type === "shop"
            ? "Invalid credentials or you don't have access to this shop"
            : t("invalidCredentials"));
        setLoading(false);
        return;
      }
      let callbackUrl = searchParams.get("callbackUrl") ?? getCallbackDefault();
      const isRootRedirect = callbackUrl === "/" || callbackUrl === `/${locale}` || callbackUrl === `/${locale}/` || (callbackUrl.startsWith("/") && callbackUrl.split("/").filter(Boolean).length <= 1);
      if (isRootRedirect) {
        await new Promise((r) => setTimeout(r, 50));
        const session = await getSession();
        const role = session?.user?.role as Role | undefined;
        callbackUrl = role && ROLE_DEFAULT_PATH[role]
          ? `/${locale}${ROLE_DEFAULT_PATH[role]}`
          : ctx.type === "admin"
            ? `/${locale}/super-admin/dashboard`
            : `/${locale}/login`;
      }
      if (callbackUrl.startsWith("/") && !callbackUrl.startsWith(`/${locale}`) && callbackUrl !== `/${locale}/login`) {
        callbackUrl = `/${locale}${callbackUrl}`;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError(t("invalidCredentials"));
    }
    setLoading(false);
  }

  const title =
    ctx.type === "admin"
      ? "System Administration"
      : ctx.type === "shop" && shopInfo
        ? shopInfo.name
        : ctx.type === "shop"
          ? "Shop Login"
          : t("signInTitle");

  const subtitle =
    ctx.type === "admin"
      ? "Super Admin Portal"
      : ctx.type === "shop"
        ? "Staff Portal"
        : "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="absolute top-4 end-4">
        <LocaleSwitcher currentLocale={locale} />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-teal-600 text-white font-bold text-xl">
            {ctx.type === "admin" ? "SA" : "POS"}
          </div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">{error}</p>
            )}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                {tCommon("email")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                {tCommon("password")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/20"
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white transition hover:bg-teal-700 active:bg-teal-800 disabled:opacity-50"
            >
              {loading ? tCommon("loading") : t("signIn")}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Dubai Mobile Shop POS</p>
        {ctx.type === "landing" && (
          <p className="mt-3 text-center text-xs text-amber-600">
            Shop staff: use your shop subdomain (e.g. demo.localhost:3000). Admin: use admin.localhost:3000
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-400">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
