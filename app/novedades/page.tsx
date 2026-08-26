"use client";

import { useEffect, useState, useCallback } from "react";
import { ClipboardList, PlusCircle, Settings, Bell, RefreshCw, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { NovedadesFilters } from "@/components/novedades/novedades-filters";
import { NovedadesTable } from "@/components/novedades/novedades-table";
import { NovedadFormModal } from "@/components/novedades/novedad-form-modal";
import { CompletarNovedadModal } from "@/components/novedades/completar-novedad-modal";
import { CategoriasConfigModal } from "@/components/novedades/categorias-config-modal";
import { ActualizacionesModal } from "@/components/novedades/actualizaciones-modal";
import {
  getNovedades,
  getCategorias,
  createNovedad,
  completarNovedad
} from "@/lib/novedades-service";
import {
  sortNovedades,
  filterNovedadesByDateRange,
  fuzzySearchNovedades
} from "@/lib/novedades-utils";
import type { Novedad, CreateNovedadInput, CategoriaNovedad } from "@/types";

export default function NovedadesPage() {
  const { user } = useAuth();
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [categorias, setCategorias] = useState<CategoriaNovedad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDIENTE" | "COMPLETADO">("ALL");
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [novedadToComplete, setNovedadToComplete] = useState<Novedad | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [novedadForUpdates, setNovedadForUpdates] = useState<Novedad | null>(null);

  // Estados de carga de acciones
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsRefreshing(true);
    setErrorMsg("");
    try {
      const [novedadesList, catList] = await Promise.all([
        getNovedades(),
        getCategorias().catch(() => [])
      ]);
      setNovedades(novedadesList);
      setCategorias(catList);
    } catch {
      setErrorMsg("Error al sincronizar los datos de la bitácora.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Estadísticas globales
  const totalCount = novedades.length;
  const pendientesCount = novedades.filter((n) => n.estado === "PENDIENTE").length;
  const completadasCount = novedades.filter((n) => n.estado === "COMPLETADO").length;

  // Procesamiento local de filtrado y orden
  const filteredByStatus =
    statusFilter === "ALL" ? novedades : novedades.filter((n) => n.estado === statusFilter);

  const filteredByCategory = categoriaFilter
    ? filteredByStatus.filter((n) => n.categoriaId === categoriaFilter)
    : filteredByStatus;

  const filteredBySearch = fuzzySearchNovedades(filteredByCategory, searchQuery);
  const filteredByDates = filterNovedadesByDateRange(filteredBySearch, fechaInicio, fechaFin);
  const sortedItems = sortNovedades(filteredByDates);

  async function handleCreateNovedad(input: CreateNovedadInput) {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await createNovedad(input, user);
      await loadData(true);
      setIsFormOpen(false);
    } catch (err) {
      throw new Error((err as Error).message || "No se pudo registrar la novedad.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmComplete(notasCierre: string) {
    if (!user || !novedadToComplete) return;
    setIsCompleting(true);
    try {
      await completarNovedad(
        {
          id: novedadToComplete.id,
          notasCierre
        },
        user
      );
      await loadData(true);
      setNovedadToComplete(null);
    } catch (err) {
      throw new Error((err as Error).message || "No se pudo completar la novedad.");
    } finally {
      setIsCompleting(false);
    }
  }

  function handleClearDates() {
    setFechaInicio("");
    setFechaFin("");
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* Cabecera Adaptativa (Smartphone & Desktop) */}
      <div className="flex flex-col gap-3.5 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between sm:pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100/80 text-indigo-600 shadow-sm shrink-0">
            <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 truncate">
              Registro de Novedades
            </h1>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">
              Bitácora operativa del hospital odontológico
            </p>
          </div>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2 pt-1 sm:pt-0">
          <button
            type="button"
            className="btn btn-secondary p-2.5 sm:px-3.5 text-slate-600 hover:text-slate-900"
            onClick={() => void loadData(false)}
            disabled={loading || isRefreshing}
            title="Actualizar bitácora"
            aria-label="Actualizar datos"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
            <span className="hidden sm:inline ml-1.5 font-bold">Actualizar</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary flex-1 sm:flex-none flex items-center justify-center gap-1.5"
            onClick={() => setIsConfigOpen(true)}
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span>Categorías</span>
          </button>

          <button
            type="button"
            className="btn btn-primary flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
            onClick={() => setIsFormOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nueva Novedad</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Estadísticas / Filtros Rápidos (3 Columnas compactas en Smartphone) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Total */}
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`card text-left p-3 sm:p-4 flex flex-col justify-between transition-all active:scale-[0.98] ${
            statusFilter === "ALL"
              ? "ring-2 ring-indigo-600/30 border-indigo-300 bg-indigo-50/20 shadow-md"
              : "bg-white hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
              Total
            </p>
            <span className="hidden sm:inline-flex rounded-lg bg-slate-50 p-1.5 text-slate-400 border border-slate-100">
              <ClipboardList className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-slate-900">{totalCount}</p>
          <span className="text-[9px] sm:text-[10px] font-bold text-indigo-600 mt-0.5">
            {statusFilter === "ALL" ? "● Activo" : "Ver todos"}
          </span>
        </button>

        {/* Pendientes */}
        <button
          type="button"
          onClick={() => setStatusFilter("PENDIENTE")}
          className={`card text-left p-3 sm:p-4 flex flex-col justify-between transition-all active:scale-[0.98] border-amber-200/80 ${
            statusFilter === "PENDIENTE"
              ? "ring-2 ring-amber-500 border-amber-400 bg-amber-50/70 shadow-md shadow-amber-100/50"
              : "bg-gradient-to-br from-amber-50/30 to-white hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-amber-700 truncate">
              Pendientes
            </p>
            <span className="hidden sm:inline-flex rounded-lg bg-amber-50 p-1.5 text-amber-600 border border-amber-200/50">
              <Bell className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-amber-800">{pendientesCount}</p>
          <span className="text-[9px] sm:text-[10px] font-bold text-amber-700 mt-0.5">
            {statusFilter === "PENDIENTE" ? "● Filtrado" : "Filtrar"}
          </span>
        </button>

        {/* Completadas */}
        <button
          type="button"
          onClick={() => setStatusFilter("COMPLETADO")}
          className={`card text-left p-3 sm:p-4 flex flex-col justify-between transition-all active:scale-[0.98] border-emerald-200/80 ${
            statusFilter === "COMPLETADO"
              ? "ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/70 shadow-md shadow-emerald-100/50"
              : "bg-gradient-to-br from-emerald-50/30 to-white hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 truncate">
              Completadas
            </p>
            <span className="hidden sm:inline-flex rounded-lg bg-emerald-50 p-1.5 text-emerald-600 border border-emerald-200/50">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 text-xl sm:text-2xl font-black text-emerald-800">{completadasCount}</p>
          <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 mt-0.5">
            {statusFilter === "COMPLETADO" ? "● Filtrado" : "Filtrar"}
          </span>
        </button>
      </div>

      {/* Alerta de Error General */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 shadow-xs" role="alert">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => void loadData(false)}
            className="ml-2 font-bold underline hover:no-underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Componente de Filtros Inteligentes */}
      <NovedadesFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onFechaInicioChange={setFechaInicio}
        onFechaFinChange={setFechaFin}
        onClearDates={handleClearDates}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoriaFilter={categoriaFilter}
        onCategoriaFilterChange={setCategoriaFilter}
        categorias={categorias}
        pendientesCount={pendientesCount}
        completadasCount={completadasCount}
        resultCount={sortedItems.length}
        totalCount={novedades.length}
      />

      {/* Tabla / Tarjetas de Novedades */}
      <NovedadesTable
        items={sortedItems}
        onCompletar={(n) => setNovedadToComplete(n)}
        onVerActualizaciones={(n) => setNovedadForUpdates(n)}
        loading={loading}
      />

      {/* Modal: Nueva Novedad */}
      <NovedadFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateNovedad}
        isSubmitting={isSubmitting}
      />

      {/* Modal: Confirmar Completado */}
      <CompletarNovedadModal
        novedad={novedadToComplete}
        onClose={() => setNovedadToComplete(null)}
        onConfirm={handleConfirmComplete}
        isSubmitting={isCompleting}
      />

      {/* Modal: Administrar Categorías */}
      <CategoriasConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onCategoriesChanged={() => void loadData(true)}
      />

      {/* Modal: Historial / Actualizaciones */}
      <ActualizacionesModal
        novedad={novedadForUpdates}
        onClose={() => setNovedadForUpdates(null)}
      />

    </div>
  );
}
