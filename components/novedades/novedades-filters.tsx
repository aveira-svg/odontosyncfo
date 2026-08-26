"use client";

import { useState } from "react";
import { Search, CalendarRange, X, ChevronDown, ChevronUp, Filter, Check } from "lucide-react";
import type { CategoriaNovedad } from "@/types";
import { formatCategoriaNombre } from "@/lib/novedades-utils";

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
  statusFilter: "ALL" | "PENDIENTE" | "COMPLETADO";
  onStatusFilterChange: (status: "ALL" | "PENDIENTE" | "COMPLETADO") => void;
  categoriaFilter?: string;
  onCategoriaFilterChange?: (catId: string) => void;
  categorias?: CategoriaNovedad[];
  pendientesCount?: number;
  completadasCount?: number;
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
  totalCount,
  statusFilter,
  onStatusFilterChange,
  categoriaFilter = "",
  onCategoriaFilterChange,
  categorias = [],
  pendientesCount = 0,
  completadasCount = 0
}: NovedadesFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(Boolean(fechaInicio || fechaFin || categoriaFilter));
  const hasActiveDates = Boolean(fechaInicio || fechaFin);
  const hasActiveFilters = hasActiveDates || Boolean(categoriaFilter) || searchQuery.trim().length > 0 || statusFilter !== "ALL";

  // Preajustes rápidos de fecha para móvil
  function applyDatePreset(days: number | "today" | "month") {
    const today = new Date();
    const toDateStr = (d: Date) => d.toISOString().split("T")[0];

    if (days === "today") {
      const dStr = toDateStr(today);
      onFechaInicioChange(dStr);
      onFechaFinChange(dStr);
    } else if (days === "month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      onFechaInicioChange(toDateStr(firstDay));
      onFechaFinChange(toDateStr(today));
    } else {
      const pastDay = new Date();
      pastDay.setDate(today.getDate() - days);
      onFechaInicioChange(toDateStr(pastDay));
      onFechaFinChange(toDateStr(today));
    }
  }

  return (
    <div className="card space-y-3.5 sm:space-y-4">
      
      {/* 1. Quick Status Pill Tabs (Single-tap filtering) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:pb-0">
        <button
          type="button"
          onClick={() => onStatusFilterChange("ALL")}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold uppercase tracking-wider transition-all active:scale-[0.97] ${
            statusFilter === "ALL"
              ? "bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span>Todos</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              statusFilter === "ALL" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
            }`}
          >
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange("PENDIENTE")}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold uppercase tracking-wider transition-all active:scale-[0.97] ${
            statusFilter === "PENDIENTE"
              ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/30"
              : "bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Pendientes</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              statusFilter === "PENDIENTE" ? "bg-white/20 text-white" : "bg-amber-200/70 text-amber-900"
            }`}
          >
            {pendientesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onStatusFilterChange("COMPLETADO")}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold uppercase tracking-wider transition-all active:scale-[0.97] ${
            statusFilter === "COMPLETADO"
              ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30"
              : "bg-emerald-50 text-emerald-800 border border-emerald-200/60 hover:bg-emerald-100"
          }`}
        >
          <Check className="h-3 w-3" />
          <span>Completadas</span>
          <span
            className={`rounded-full px-1.5 py-0.2 text-[10px] ${
              statusFilter === "COMPLETADO" ? "bg-white/20 text-white" : "bg-emerald-200/70 text-emerald-900"
            }`}
          >
            {completadasCount}
          </span>
        </button>
      </div>

      {/* 2. Main Search Bar & Toggle Advanced Filters */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        
        {/* Search Input with Instant Clear */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="h-4 w-4" aria-hidden="true" />
          </div>
          <input
            id="novedades-search"
            type="search"
            className="input pl-10 pr-9 py-2.5"
            placeholder="Buscar por título, box, expediente, persona..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar en la bitácora"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-700"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Toggle Advanced Filters Button */}
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className={`flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all sm:w-auto ${
            hasActiveDates || categoriaFilter
              ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>Filtros avanzados</span>
          {(hasActiveDates || categoriaFilter) && (
            <span className="h-2 w-2 rounded-full bg-indigo-600" />
          )}
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* 3. Collapsible Advanced Filters (Dates & Category) */}
      {showAdvanced && (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 space-y-3 animate-in slide-in-from-top-2 duration-200">
          
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Category Filter */}
            {categorias.length > 0 && onCategoriaFilterChange && (
              <div>
                <label
                  htmlFor="filter-category"
                  className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500"
                >
                  Categoría
                </label>
                <select
                  id="filter-category"
                  className="input bg-white py-2"
                  value={categoriaFilter}
                  onChange={(e) => onCategoriaFilterChange(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {formatCategoriaNombre(cat.nombre)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Start Date */}
            <div>
              <label
                htmlFor="fecha-inicio"
                className="mb-1 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500"
              >
                <CalendarRange className="h-3 w-3" aria-hidden="true" />
                Fecha Inicio
              </label>
              <input
                id="fecha-inicio"
                type="date"
                className="input bg-white py-2"
                value={fechaInicio}
                onChange={(e) => onFechaInicioChange(e.target.value)}
              />
            </div>

            {/* End Date */}
            <div>
              <label
                htmlFor="fecha-fin"
                className="mb-1 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500"
              >
                Fecha Fin
              </label>
              <input
                id="fecha-fin"
                type="date"
                className="input bg-white py-2"
                value={fechaFin}
                onChange={(e) => onFechaFinChange(e.target.value)}
                min={fechaInicio || undefined}
              />
            </div>
          </div>

          {/* Quick Date Presets Chips for Mobile & Clear */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 pt-2.5">
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mr-1">
                Accesos rápidos:
              </span>
              <button
                type="button"
                onClick={() => applyDatePreset("today")}
                className="rounded-lg bg-white border border-slate-200 px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset(7)}
                className="rounded-lg bg-white border border-slate-200 px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
              >
                Últimos 7 días
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset("month")}
                className="rounded-lg bg-white border border-slate-200 px-2 py-1 font-semibold text-slate-700 hover:bg-slate-100 active:scale-95"
              >
                Este mes
              </button>
            </div>

            {(hasActiveDates || categoriaFilter) && (
              <button
                type="button"
                onClick={() => {
                  onClearDates();
                  if (onCategoriaFilterChange) onCategoriaFilterChange("");
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 transition-colors"
              >
                Limpiar filtros avanzados
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Live Counter / Result Summary */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
        <p className="font-semibold" aria-live="polite">
          Mostrando <span className="font-bold text-slate-800">{resultCount}</span> de{" "}
          <span className="font-bold text-slate-800">{totalCount}</span> novedades
        </p>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              onStatusFilterChange("ALL");
              onClearDates();
              if (onCategoriaFilterChange) onCategoriaFilterChange("");
            }}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
          >
            Restablecer todo
          </button>
        )}
      </div>

    </div>
  );
}
