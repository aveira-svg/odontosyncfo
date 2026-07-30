"use client";

import { Search, CalendarRange } from "lucide-react";

type NovedadesFiltersProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  fechaInicio: string;
  fechaFin: string;
  onFechaInicioChange: (value: string) => void;
  onFechaFinChange: (value: string) => void;
  onClearDates: () => void;
  resultCount: number;
  totalCount: number;
};

export function NovedadesFilters({
  searchQuery,
  onSearchChange,
  fechaInicio,
  fechaFin,
  onFechaInicioChange,
  onFechaFinChange,
  onClearDates,
  resultCount,
  totalCount
}: NovedadesFiltersProps) {
  return (
    <div className="card space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-800">Filtros</h2>
          <p className="text-xs font-medium text-slate-500">
            Búsqueda inteligente y rango de fechas sobre la bitácora
          </p>
        </div>
        <p className="text-xs font-semibold text-slate-500" aria-live="polite">
          {resultCount} de {totalCount} registros
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto_auto]">
        <div>
          <label htmlFor="novedades-search" className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Buscador inteligente
          </label>
          <input
            id="novedades-search"
            type="search"
            className="input"
            placeholder="Título, expediente, box, categoría, creador..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-describedby="search-hint"
          />
          <p id="search-hint" className="mt-1 text-[10px] text-slate-400">
            Búsqueda difusa en título, descripción, expediente, box, categoría y usuarios
          </p>
        </div>

        <div>
          <label htmlFor="fecha-inicio" className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
            Fecha inicio
          </label>
          <input
            id="fecha-inicio"
            type="date"
            className="input"
            value={fechaInicio}
            onChange={(e) => onFechaInicioChange(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="fecha-fin" className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
            Fecha fin
          </label>
          <input
            id="fecha-fin"
            type="date"
            className="input"
            value={fechaFin}
            onChange={(e) => onFechaFinChange(e.target.value)}
            min={fechaInicio || undefined}
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            className="btn btn-secondary w-full whitespace-nowrap lg:w-auto"
            onClick={onClearDates}
            disabled={!fechaInicio && !fechaFin}
          >
            Limpiar fechas
          </button>
        </div>
      </div>
    </div>
  );
}
