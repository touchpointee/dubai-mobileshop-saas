"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type Branch = { _id: string; name: string; isDefault?: boolean; isActive?: boolean };
type Shift = {
  _id: string;
  openingCash: number;
  countedCash?: number;
  expectedCash?: number;
  variance?: number;
  cashSales?: number;
  cashRefunds?: number;
  status: string;
  openedAt: string;
  closedAt?: string;
  openedBy?: { name?: string };
  closedBy?: { name?: string };
};
type ShiftResponse = { active?: Shift | null; history: Shift[] };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ShiftCloseSection() {
  const { data: branches = [] } = useSWR<Branch[]>("/api/branches", fetcher);
  const [branchId, setBranchId] = useState("");
  const [openingCash, setOpeningCash] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const activeBranches = branches.filter((b) => b.isActive !== false);
  useEffect(() => {
    if (!branchId && activeBranches.length > 0) {
      setBranchId(activeBranches.find((b) => b.isDefault)?._id || activeBranches[0]._id);
    }
  }, [activeBranches, branchId]);

  const key = branchId ? `/api/shifts?branchId=${branchId}` : null;
  const { data } = useSWR<ShiftResponse>(key, fetcher);

  async function submit(action: "open" | "close") {
    if (!branchId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          branchId,
          openingCash: Number(openingCash) || 0,
          countedCash: Number(countedCash) || 0,
          notes,
        }),
      });
      if (res.ok) {
        setOpeningCash("");
        setCountedCash("");
        setNotes("");
        if (key) mutate(key);
      } else {
        const error = await res.json().catch(() => ({}));
        alert(error.error || "Failed to save shift");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="Shift close / Z-report" description="Open and close branch cash shifts with variance reporting." />
      <div className="mx-6 mb-6 space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-4 md:grid-cols-4 md:items-end">
            <div>
              <Label>Branch</Label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3">
                {activeBranches.map((branch) => <option key={branch._id} value={branch._id}>{branch.name}</option>)}
              </select>
            </div>
            {!data?.active ? (
              <>
                <div><Label>Opening cash</Label><Input type="number" step="0.01" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} /></div>
                <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                <Button disabled={saving || !branchId} onClick={() => submit("open")}>Open shift</Button>
              </>
            ) : (
              <>
                <div><Label>Counted cash</Label><Input type="number" step="0.01" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} /></div>
                <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
                <Button disabled={saving || !branchId} onClick={() => submit("close")}>Close shift</Button>
              </>
            )}
          </div>
          {data?.active && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3 text-sm"><span className="text-slate-500">Opened</span><p className="font-semibold">{formatDateTime(data.active.openedAt)}</p></div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm"><span className="text-slate-500">Opening cash</span><p className="font-semibold">{formatCurrency(data.active.openingCash)}</p></div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm"><span className="text-slate-500">Opened by</span><p className="font-semibold">{data.active.openedBy?.name ?? "-"}</p></div>
            </div>
          )}
        </section>

        <DataTable
          columns={[
            { key: "openedAt", header: "Opened", render: (s: Shift) => formatDateTime(s.openedAt) },
            { key: "closedAt", header: "Closed", render: (s: Shift) => s.closedAt ? formatDateTime(s.closedAt) : "-" },
            { key: "openingCash", header: "Opening", render: (s: Shift) => formatCurrency(s.openingCash) },
            { key: "cashSales", header: "Cash sales", render: (s: Shift) => formatCurrency(s.cashSales ?? 0) },
            { key: "expectedCash", header: "Expected", render: (s: Shift) => formatCurrency(s.expectedCash ?? 0) },
            { key: "countedCash", header: "Counted", render: (s: Shift) => formatCurrency(s.countedCash ?? 0) },
            { key: "variance", header: "Variance", render: (s: Shift) => <span className={(s.variance ?? 0) === 0 ? "text-slate-700" : "font-semibold text-red-600"}>{formatCurrency(s.variance ?? 0)}</span> },
          ]}
          data={data?.history ?? []}
          emptyMessage="No closed shifts yet."
        />
      </div>
    </div>
  );
}
