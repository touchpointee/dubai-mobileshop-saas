"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = { value: string; label: string };

type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  addButtonLabel?: string;
  onAdd?: () => void;
  className?: string;
  disabled?: boolean;
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  required,
  addButtonLabel,
  onAdd,
  className,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const selectedLabel = selectedOption ? selectedOption.label : "";

  const filteredOptions = searchQuery.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  const close = useCallback(() => {
    setOpen(false);
    setSearchQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, close]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const list = wrapperRef.current?.querySelector("[data-option-list]");
      const focused = document.activeElement;
      if (!list || !focused) return;
      const items = Array.from(list.querySelectorAll<HTMLElement>("[data-option-value]"));
      const idx = items.indexOf(focused as HTMLElement);
      if (idx < 0) return;
      const next = e.key === "ArrowDown" ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
      items[next]?.focus();
    }
    if (e.key === "Enter" && (e.target as HTMLElement).getAttribute?.("data-option-value")) {
      e.preventDefault();
      const v = (e.target as HTMLElement).getAttribute("data-option-value");
      if (v !== null) {
        onChange(v);
        close();
      }
    }
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)} onKeyDown={handleKeyDown}>
      <div
        className={cn(
          "flex h-9 w-full items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 disabled:cursor-not-allowed disabled:opacity-50",
          open && "border-teal-500 ring-2 ring-teal-500/20"
        )}
      >
        {open ? (
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onBlur={() => {}}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-slate-400"
            disabled={disabled}
          />
        ) : (
          <button
            type="button"
            onClick={() => !disabled && setOpen(true)}
            disabled={disabled}
            className={cn(
              "min-w-0 flex-1 text-left outline-none",
              selectedLabel ? "text-slate-900" : "text-slate-400"
            )}
          >
            {selectedLabel || placeholder}
          </button>
        )}
        <ChevronDown
          size={16}
          className={cn("shrink-0 text-slate-400 transition", open && "rotate-180")}
        />
      </div>

      {open && (
        <div
          data-option-list
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filteredOptions.length === 0 && !onAdd ? (
            <div className="px-3 py-2 text-sm text-slate-500">No options</div>
          ) : (
            <>
              {filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  data-option-value={opt.value}
                  tabIndex={0}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                  onClick={() => {
                    onChange(opt.value);
                    close();
                  }}
                >
                  {opt.label}
                </button>
              ))}
              {onAdd && addButtonLabel && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-3 py-2 text-left text-sm text-teal-600 hover:bg-teal-50 focus:bg-teal-50 focus:outline-none"
                  onClick={() => {
                    close();
                    onAdd();
                  }}
                >
                  <Plus size={14} />
                  {addButtonLabel}
                </button>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}
