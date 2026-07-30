"use client";

import { useEffect, useState } from "react";
import { ClipboardList, PlusCircle, Settings, Bell } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { NovedadesFilters } from "@/components/novedades/novedades-filters";
import { NovedadesTable } from "@/components/novedades/novedades-table";
import { NovedadFormModal } from "@/components/novedades/novedad-form-modal";
import { CompletarNovedadModal } from "@/components/novedades/completar-novedad-modal";
import { CategoriasConfigModal } from "@/components/novedades/categorias-config-modal";
import { ActualizacionesModal } from "@/components/novedades/actualizaciones-modal";
import {
  getNovedades,
  createNovedad,
  completarNovedad
} from "@/lib/novedades-service";
import {
  sortNovedades,
  filterNovedadesByDateRange,
  fuzzySearchNovedades
} from "@/lib/novedades-utils";
import type { Novedad, CreateNovedadInput } from "@/types";

export default function NovedadesPage() {
  const { user } = useAuth();
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
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

  async function loadData() {
    setLoading(true);
    setErrorMsg("");
    try {
      const novedadesList = await getNovedades();
      setNovedades(novedadesList);
    } catch {
      setErrorMsg("Error al sincronizar los datos de la bitácora.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // Procesamiento local de filtrado y orden
  const filteredBySearch = fuzzySearchNovedades(novedades, searchQuery);
  const filteredByDates = filterNovedadesByDateRange(filteredBySearch, fechaInicio, fechaFin);
  const sortedItems = sortNovedades(filteredByDates);

  // Estadísticas para las tarjetas superiores (Premium UI)
  const totalCount = novedades.length;
  const pendientesCount = novedades.filter((n) => n.estado === "PENDIENTE").length;
  const completadasCount = novedades.filter((n) => n.estado === "COMPLETADO").length;

  async function handleCreateNovedad(input: CreateNovedadInput) {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await createNovedad(input, user);
      await loadData();
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
      await loadData();
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
    <div className="space-y-6">
      
      {/* Cabecera Premium */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
              Registro de Novedades
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Bitácora operativa del hospital odontológico
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary flex items-center gap-1.5"
            onClick={() => setIsConfigOpen(true)}
          >
            <Settings className="h-4 w-4" />
            Configurar Categorías
          </button>
          <button
            type="button"
            className="btn btn-primary flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
            onClick={() => setIsFormOpen(true)}
          >
            <PlusCircle className="h-4 w-4" />
            Nueva Novedad
          </button>
        </div>
      </div>

      {/* Tarjetas de Estadísticas Premium */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card bg-white flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Novedades</p>
            <p className="mt-1 text-2xl font-black text-slate-800">{totalCount}</p>
          </div>
          <span className="rounded-xl bg-slate-50 p-2.5 text-slate-400 border border-slate-100">
            <ClipboardList className="h-5 w-5" />
          </span>
        </div>

        <div className="card bg-gradient-to-br from-amber-50/50 to-white flex items-center justify-between border-amber-100">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Pendientes de Acción</p>
            <p className="mt-1 text-2xl font-black text-amber-800">{pendientesCount}</p>
          </div>
          <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600 border border-amber-100/50 animate-pulse">
            <Bell className="h-5 w-5" />
          </span>
        </div>

        <div className="card bg-gradient-to-br from-emerald-50/40 to-white flex items-center justify-between border-emerald-100">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Completadas / Vistas</p>
            <p className="mt-1 text-2xl font-black text-emerald-800">{completadasCount}</p>
          </div>
          <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 border border-emerald-100/50">
            <PlusCircle className="h-5 w-5" />
          </span>
        </div>
      </div>

      {/* Alerta de Error General */}
      {errorMsg && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700" role="alert">
          {errorMsg}
        </div>
      )}

      {/* Componente de Filtros */}
      <NovedadesFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        fechaInicio={fechaInicio}
        fechaFin={fechaFin}
        onFechaInicioChange={setFechaInicio}
        onFechaFinChange={setFechaFin}
        onClearDates={handleClearDates}
        resultCount={sortedItems.length}
        totalCount={novedades.length}
      />

      {/* Tabla de Novedades */}
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
        onCategoriesChanged={() => void loadData()}
      />

      {/* Modal: Historial / Actualizaciones */}
      <ActualizacionesModal
        novedad={novedadForUpdates}
        onClose={() => setNovedadForUpdates(null)}
      />

    </div>
  );
}
