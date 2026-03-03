"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR, { mutate as globalMutate } from "swr";
import { useReactToPrint } from "react-to-print";
import { ArrowLeft, FileText, Plus, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { SERVICE_JOB_STATUSES } from "@/lib/constants";

type ServiceJob = {
  _id: string;
  customerName: string;
  customerPhone?: string;
  deviceDescription: string;
  deviceCondition?: string;
  notes?: string;
  status: string;
  proposedPrice?: number;
  finalCharge?: number;
  acceptedAt?: string;
  completedAt?: string;
  createdAt: string;
};

type ServiceInvoice = {
  _id: string;
  invoiceNumber: string;
  labourAmount: number;
  items: { productName: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  total: number;
  createdAt: string;
};

type ServiceJobLogEntry = {
  _id: string;
  type: string;
  description: string;
  fromValue?: string;
  toValue?: string;
  note?: string;
  createdAt: string;
  userId?: string;
};

type Product = { _id: string; name: string; sellPrice: number; quantity: number; channel: string };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function ServiceInvoiceRow({ invoice, jobRef }: { invoice: ServiceInvoice; jobRef: string }) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Service-Invoice-${invoice.invoiceNumber}`,
  });
  return (
    <li className="py-2 flex items-center justify-between gap-2 text-sm">
      {/* Printable content: off-screen on screen, printed via react-to-print */}
      <div ref={printRef} className="absolute left-[-9999px] w-[210mm] p-4 bg-white text-slate-900">
        <h3 className="font-semibold text-slate-900">Service invoice — {invoice.invoiceNumber}</h3>
        <p className="text-xs text-slate-500">Job: {jobRef}</p>
        <p className="text-sm mt-1">Labour: {formatCurrency(invoice.labourAmount)}</p>
        {invoice.items && invoice.items.length > 0 && (
          <table className="w-full text-sm mt-2 border border-slate-200 rounded">
            <thead className="bg-slate-50"><tr><th className="text-left px-2 py-1">Part</th><th className="text-right px-2 py-1">Qty</th><th className="text-right px-2 py-1">Price</th><th className="text-right px-2 py-1">Total</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item, i) => (
                <tr key={i}>
                  <td className="px-2 py-1">{item.productName}</td>
                  <td className="px-2 py-1 text-right">{item.quantity}</td>
                  <td className="px-2 py-1 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-2 py-1 text-right">{formatCurrency(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-sm font-semibold mt-2">Total: {formatCurrency(invoice.total)}</p>
      </div>
      <span>{invoice.invoiceNumber}</span>
      <span className="font-medium">{formatCurrency(invoice.total)}</span>
      <Button variant="ghost" size="sm" className="shrink-0" onClick={() => handlePrint()}>
        <Printer size={14} className="mr-1" />
        Print
      </Button>
    </li>
  );
}

export function ServiceJobDetailContent({ jobId }: { jobId: string; basePath?: string }) {
  const pathname = usePathname();
  const basePath = pathname?.replace(/\/service\/[^/]+$/, "") ?? "";
  const { data: job, isLoading, mutate: mutateJob } = useSWR<ServiceJob>(jobId ? `/api/service-jobs/${jobId}` : null, fetcher);
  const { data: invoices } = useSWR<ServiceInvoice[]>(
    jobId ? `/api/service-invoices?serviceJobId=${jobId}` : null,
    fetcher
  );
  const { data: logs = [] } = useSWR<ServiceJobLogEntry[]>(
    jobId ? `/api/service-jobs/${jobId}/logs` : null,
    fetcher
  );
  const { data: productsVat } = useSWR<Product[]>("/api/products", fetcher);

  const [saving, setSaving] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [billForm, setBillForm] = useState({ labourAmount: "" });
  const [billLines, setBillLines] = useState<{ productId: string; productName: string; quantity: number; unitPrice: number; channel: "VAT" }[]>([]);
  const [addPartProduct, setAddPartProduct] = useState("");
  const [addPartQty, setAddPartQty] = useState(1);

  async function updateJob(updates: Partial<ServiceJob>) {
    if (!jobId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/service-jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        mutateJob();
        globalMutate(`/api/service-jobs/${jobId}/logs`);
      }
    } finally {
      setSaving(false);
    }
  }

  function addPart() {
    const p = productsVat?.find((x) => x._id === addPartProduct);
    if (!p) return;
    setBillLines((prev) => [...prev, { productId: p._id, productName: p.name, quantity: addPartQty, unitPrice: p.sellPrice, channel: "VAT" }]);
    setAddPartProduct("");
    setAddPartQty(1);
  }

  function removeBillLine(i: number) {
    setBillLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function createInvoice() {
    if (!jobId) return;
    const labour = Number(billForm.labourAmount) || 0;
    const items = billLines.map((l) => ({ productId: l.productId, productName: l.productName, quantity: l.quantity, unitPrice: l.unitPrice, channel: l.channel }));
    setSaving(true);
    try {
      const res = await fetch("/api/service-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceJobId: jobId, labourAmount: labour, items }),
      });
      if (res.ok) {
        setBillModalOpen(false);
        setBillForm({ labourAmount: "" });
        setBillLines([]);
        globalMutate(`/api/service-invoices?serviceJobId=${jobId}`);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Error creating invoice");
      }
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !job) return <div className="p-6">Loading…</div>;

  const productsForChannel = productsVat;
  const partsTotal = billLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const labour = Number(billForm.labourAmount) || 0;
  const billTotal = labour + partsTotal;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={job.deviceDescription}
        description={`${job.customerName}${job.customerPhone ? ` · ${job.customerPhone}` : ""}`}
      >
        <Link href={`${basePath}/service`}>
          <Button variant="outline">
            <ArrowLeft size={16} className="mr-1.5" />
            Back
          </Button>
        </Link>
      </PageHeader>

      <div className="px-6 pb-6 space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Info</h3>
          <dl className="grid gap-2 text-sm">
            <div><dt className="text-slate-500">Customer</dt><dd>{job.customerName}</dd></div>
            {job.customerPhone && <div><dt className="text-slate-500">Phone</dt><dd>{job.customerPhone}</dd></div>}
            <div><dt className="text-slate-500">Device</dt><dd>{job.deviceDescription}</dd></div>
            {job.deviceCondition && <div><dt className="text-slate-500">Condition</dt><dd>{job.deviceCondition}</dd></div>}
            {job.notes && <div><dt className="text-slate-500">Notes</dt><dd>{job.notes}</dd></div>}
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Status</h3>
          <select
            value={job.status}
            onChange={(e) => updateJob({ status: e.target.value })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {SERVICE_JOB_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          {job.status === "QUOTE_SENT" && (
            <Button
              className="mt-2"
              size="sm"
              onClick={() => updateJob({ status: "CUSTOMER_ACCEPTED", acceptedAt: new Date().toISOString() })}
            >
              Customer accepted
            </Button>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Pricing</h3>
          <div className="flex flex-wrap gap-4">
            <div>
              <Label className="text-xs">Proposed price</Label>
              <Input
                type="number"
                step="0.01"
                value={job.proposedPrice ?? ""}
                onChange={(e) => updateJob({ proposedPrice: e.target.value ? Number(e.target.value) : undefined })}
                className="mt-1 w-32"
              />
            </div>
            <div>
              <Label className="text-xs">Final charge</Label>
              <Input
                type="number"
                step="0.01"
                value={job.finalCharge ?? ""}
                onChange={(e) => updateJob({ finalCharge: e.target.value ? Number(e.target.value) : undefined })}
                className="mt-1 w-32"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">History</h3>
          {logs.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {logs.map((log) => (
                <li key={log._id} className="flex flex-col gap-0.5 border-l-2 border-slate-200 pl-3 py-1">
                  <span className="text-slate-500 font-mono text-xs">{formatDateTime(log.createdAt)}</span>
                  <span className="font-medium text-slate-900">{log.description}</span>
                  {(log.fromValue != null || log.toValue != null) && (
                    <span className="text-slate-600">
                      {log.fromValue != null ? log.fromValue : "—"} → {log.toValue != null ? log.toValue : "—"}
                    </span>
                  )}
                  {log.note && <span className="text-slate-500 italic">{log.note}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No activity yet.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700">Bills</h3>
            <Button size="sm" onClick={() => setBillModalOpen(true)}>
              <FileText size={14} className="mr-1" />
              Generate bill
            </Button>
          </div>
          {invoices && invoices.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <ServiceInvoiceRow key={inv._id} invoice={inv} jobRef={job.deviceDescription} />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No invoices yet. Generate a bill to add labour and parts.</p>
          )}
        </section>
      </div>

      <Modal open={billModalOpen} onClose={() => setBillModalOpen(false)} title="Generate bill" size="lg">
        <div className="space-y-4">
          <div>
            <Label>Labour amount</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={billForm.labourAmount}
              onChange={(e) => setBillForm((f) => ({ ...f, labourAmount: e.target.value }))}
              className="mt-1 w-40"
            />
          </div>
          <div>
            <Label>Add part</Label>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <select
                value={addPartProduct}
                onChange={(e) => setAddPartProduct(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm flex-1 min-w-[140px]"
              >
                <option value="">Select product</option>
                {(productsForChannel ?? []).filter((p) => p.quantity > 0).map((p) => (
                  <option key={p._id} value={p._id}>{p.name} — {formatCurrency(p.sellPrice)}</option>
                ))}
              </select>
              <Input type="number" min="1" value={addPartQty} onChange={(e) => setAddPartQty(Number(e.target.value) || 1)} className="w-20" />
              <Button type="button" variant="outline" size="sm" onClick={addPart} disabled={!addPartProduct}>
                <Plus size={14} /> Add
              </Button>
            </div>
          </div>
          {billLines.length > 0 && (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-3 py-2">Part</th>
                    <th className="text-right px-3 py-2">Qty</th>
                    <th className="text-right px-3 py-2">Price</th>
                    <th className="text-right px-3 py-2">Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {billLines.map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{l.productName}</td>
                      <td className="text-right px-3 py-2">{l.quantity}</td>
                      <td className="text-right px-3 py-2">{formatCurrency(l.unitPrice)}</td>
                      <td className="text-right px-3 py-2">{formatCurrency(l.quantity * l.unitPrice)}</td>
                      <td><Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeBillLine(i)}>✕</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-between items-center border-t border-slate-100 pt-4">
            <span className="font-medium">Total: {formatCurrency(billTotal)}</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBillModalOpen(false)}>Cancel</Button>
              <Button onClick={createInvoice} disabled={saving}>{saving ? "Creating…" : "Create invoice"}</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
