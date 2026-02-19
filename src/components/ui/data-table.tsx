"use client";

import { cn } from "@/lib/utils";

type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
};

export function DataTable<T extends { _id: string }>({
  columns,
  data,
  emptyMessage = "No data found.",
  onRowClick,
  className,
}: {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}) {
  const rows = Array.isArray(data) ? data : [];
  return (
    <div className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn("px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500", col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row) => (
              <tr
                key={row._id}
                className={cn(
                  "transition-colors hover:bg-slate-50/50",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3 text-slate-700", col.className)}>
                    {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-slate-400">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
}
