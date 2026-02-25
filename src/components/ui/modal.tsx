"use client";

import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = "md",
  zIndex,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  /** Use a higher value (e.g. 100) when this modal is opened on top of another modal */
  zIndex?: number;
}) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "";
      };
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
    "2xl": "w-[95vw] max-w-[95vw] h-[95vh] max-h-[95vh] overflow-hidden flex flex-col",
  }[size];

  const isFullView = size === "2xl";

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-2"
      style={{ zIndex: zIndex ?? 50 }}
    >
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative w-full animate-fade-in rounded-xl border border-slate-200 bg-white shadow-xl",
          !isFullView && "max-h-[90vh] overflow-y-auto",
          sizeClasses,
          className
        )}
      >
        {(title || description) && (
          <div className={cn("flex items-start justify-between border-b border-slate-100 px-6", isFullView ? "py-3 shrink-0" : "py-4")}>
            <div>
              {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className={cn(isFullView ? "px-4 py-3 flex-1 min-h-0 overflow-hidden flex flex-col" : "px-6 py-4")}>{children}</div>
      </div>
    </div>
  );
}
