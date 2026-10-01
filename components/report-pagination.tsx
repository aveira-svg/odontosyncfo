"use client";

export type PageSizeOption = 50 | 100 | 250 | 500 | "todos";

export interface ReportPaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: PageSizeOption;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSizeOption) => void;
  pageSizeOptions?: PageSizeOption[];
}

export function ReportPagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [50, 100, 250, 500, "todos"]
}: ReportPaginationProps) {
  if (totalItems === 0) return null;

  const isAll = pageSize === "todos";
  const effectivePageSize = isAll ? totalItems : (pageSize as number);
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = isAll ? 1 : (safeCurrentPage - 1) * effectivePageSize + 1;
  const endItem = isAll ? totalItems : Math.min(safeCurrentPage * effectivePageSize, totalItems);

  function handlePageSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "todos") {
      onPageSizeChange("todos");
      onPageChange(1);
    } else {
      const num = Number(val) as PageSizeOption;
      onPageSizeChange(num);
      onPageChange(1);
    }
  }

  return (
    <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 bg-slate-50/80 px-4 py-3 rounded-b-xl text-xs text-slate-700">
      {/* Resumen de items mostrados */}
      <div className="flex items-center gap-2 font-medium">
        <span>
          Mostrando <strong className="text-slate-900 font-bold">{startItem}</strong>–
          <strong className="text-slate-900 font-bold">{endItem}</strong> de{" "}
          <strong className="text-slate-900 font-bold">{totalItems}</strong> registros
        </span>
      </div>

      {/* Controles: selector de tamaño y botones de navegación */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Selector de filas por página */}
        <div className="flex items-center gap-2">
          <label htmlFor="report-page-size" className="font-semibold text-slate-600">
            Filas:
          </label>
          <select
            id="report-page-size"
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {pageSizeOptions.map((opt) => (
              <option key={String(opt)} value={opt}>
                {opt === "todos" ? "Todos" : opt}
              </option>
            ))}
          </select>
        </div>

        {/* Botones de navegación (solo visibles si hay más de 1 página) */}
        {!isAll && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={safeCurrentPage <= 1}
              aria-label="Primera página"
              title="Primera página"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white font-bold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              «
            </button>
            <button
              type="button"
              onClick={() => onPageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage <= 1}
              aria-label="Página anterior"
              title="Página anterior"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white font-bold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹
            </button>

            <span className="px-2 font-semibold text-slate-800">
              Página <strong className="font-bold">{safeCurrentPage}</strong> de{" "}
              <strong>{totalPages}</strong>
            </span>

            <button
              type="button"
              onClick={() => onPageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage >= totalPages}
              aria-label="Página siguiente"
              title="Página siguiente"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white font-bold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ›
            </button>
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={safeCurrentPage >= totalPages}
              aria-label="Última página"
              title="Última página"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white font-bold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
