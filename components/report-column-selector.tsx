"use client";

import { Columns } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ReportColumnOption = {
  key: string;
  label: string;
};

export function createVisibleColumns(keys: string[]): Record<string, boolean> {
  return Object.fromEntries(keys.map((key) => [key, true]));
}

type ReportColumnSelectorProps = {
  columns: ReportColumnOption[];
  visibleColumns: Record<string, boolean>;
  onToggle: (key: string) => void;
};

export function ReportColumnSelector({
  columns,
  visibleColumns,
  onToggle
}: ReportColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handlePointerDown);
    }

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const enabledCount = columns.filter((column) => visibleColumns[column.key]).length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="report-column-menu"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <Columns className="h-4 w-4 shrink-0" aria-hidden="true" />
        Columnas
      </button>

      {open && (
        <div
          id="report-column-menu"
          role="menu"
          aria-label="Seleccionar columnas visibles"
          className="absolute right-0 top-full z-20 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Columnas visibles
          </p>
          <ul className="space-y-2" role="none">
            {columns.map((column) => {
              const checked = visibleColumns[column.key];
              const isLastEnabled = checked && enabledCount <= 1;

              return (
                <li key={column.key} role="none">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm text-slate-700 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isLastEnabled}
                      onChange={() => onToggle(column.key)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                    />
                    <span>{column.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
