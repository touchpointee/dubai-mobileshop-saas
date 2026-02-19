"use client";

import Link from "next/link";

export function LandingPage({ locale }: { locale: string }) {
  const adminUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//admin.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000"}`
      : "#";

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500 text-sm font-bold text-white">
            POS
          </div>
          <span className="text-lg font-semibold text-white">Dubai Mobile Shop</span>
        </div>
        <a
          href={adminUrl}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Admin Login
        </a>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-4 text-4xl font-bold text-white sm:text-5xl">
          Cloud POS for<br />
          <span className="text-teal-400">Dubai Mobile Shops</span>
        </h1>
        <p className="mb-8 max-w-lg text-lg text-slate-300">
          Multi-tenant point of sale with VAT & Non-VAT billing, IMEI tracking,
          thermal receipts, A4 invoices, and owner dashboards. Bilingual EN/AR with RTL.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-white backdrop-blur">
            <p className="text-2xl font-bold text-teal-400">VAT + Non-VAT</p>
            <p className="text-sm text-slate-400">Dual billing channels</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-white backdrop-blur">
            <p className="text-2xl font-bold text-teal-400">IMEI</p>
            <p className="text-sm text-slate-400">Phone tracking</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-white backdrop-blur">
            <p className="text-2xl font-bold text-teal-400">EN / AR</p>
            <p className="text-sm text-slate-400">Bilingual RTL</p>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-sm text-slate-500">
        Each shop gets its own subdomain: <code className="text-teal-400">shopname.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || "yourdomain.com"}</code>
      </footer>
    </div>
  );
}
