"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, FileText, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Dealer = {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
  trnNumber?: string;
  balance: number;
};

type Purchase = {
  _id: string;
  invoiceNumber: string;
  purchaseDate: string;
  totalAmount: number;
  grandTotal: number;
  items?: { productName: string; quantity: number; costPrice: number; totalPrice: number }[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function DealerDetailPageContent({ dealerId }: { dealerId: string }) {
  const pathname = usePathname();
  const basePath = pathname?.replace(/\/dealers\/[^/]+$/, "") ?? "";
  const { data: dealer, isLoading: dealerLoading } = useSWR<Dealer>(
    dealerId ? `/api/dealers/${dealerId}` : null,
    fetcher
  );
  const { data: purchases = [], isLoading: purchasesLoading } = useSWR<Purchase[]>(
    dealerId ? `/api/dealers/${dealerId}/purchases` : null,
    fetcher
  );

  const isLoading = dealerLoading;
  if (isLoading || !dealer) return <PageSkeleton />;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={dealer.name}
        description={dealer.company ? `${dealer.company} · Balance: ${formatCurrency(dealer.balance)}` : `Balance: ${formatCurrency(dealer.balance)}`}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
            <Printer size={16} className="mr-1.5" />
            Print dealer statement
          </Button>
          <Link
            href={basePath + "/dealers"}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ArrowLeft size={16} className="mr-1.5" />
            Back to dealers
          </Link>
        </div>
      </PageHeader>

      <div className="px-6 pb-6 space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">Dealer details</h2>
          <div className="grid gap-2 text-sm">
            {dealer.phone && <p><span className="text-slate-500">Phone:</span> {dealer.phone}</p>}
            {dealer.email && <p><span className="text-slate-500">Email:</span> {dealer.email}</p>}
            {dealer.company && <p><span className="text-slate-500">Company:</span> {dealer.company}</p>}
            {dealer.address && <p><span className="text-slate-500">Address:</span> {dealer.address}</p>}
            {dealer.trnNumber && <p><span className="text-slate-500">TRN:</span> {dealer.trnNumber}</p>}
            <p className="font-medium"><span className="text-slate-500">Balance owed:</span> {formatCurrency(dealer.balance)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-900">Bills (purchases)</h2>
            <p className="text-sm text-slate-500 mt-0.5">Invoice history for this dealer</p>
          </div>
          {purchasesLoading ? (
            <div className="p-8 text-center text-slate-500">Loading…</div>
          ) : purchases.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No purchases yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-2.5 text-left font-medium text-slate-600">Invoice</th>
                    <th className="px-5 py-2.5 text-left font-medium text-slate-600">Date</th>
                    <th className="px-5 py-2.5 text-right font-medium text-slate-600">Total</th>
                    <th className="px-5 py-2.5 text-right font-medium text-slate-600 w-24">Print</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {purchases.map((p) => (
                    <tr key={p._id}>
                      <td className="px-5 py-3 font-medium text-slate-900">{p.invoiceNumber}</td>
                      <td className="px-5 py-3 text-slate-600">{formatDate(p.purchaseDate)}</td>
                      <td className="px-5 py-3 text-right font-medium text-slate-900">{formatCurrency(p.grandTotal ?? p.totalAmount)}</td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.print()}
                          className="print-purchase-trigger"
                          data-purchase-id={p._id}
                        >
                          <FileText size={14} className="mr-1" />
                          Print
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
