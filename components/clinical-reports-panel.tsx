"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createVisibleColumns,
  ReportColumnSelector,
  type ReportColumnOption
} from "@/components/report-column-selector";
import { getPracticasClinicas, getProfesionales, getServicios, getPasantes } from "@/lib/supabase-service";
import type { PracticaClinica, Profesional, Servicio, Pasante } from "@/types";
import { formatDateEsAr } from "@/lib/date-utils";
import type { AppTimestamp } from "@/types";

const FILTER_LABEL =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500";
const FILTER_INPUT =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const KPI_CARD =
  "flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-6 shadow-sm";
const KPI_LABEL = "text-xs font-semibold uppercase tracking-wider text-slate-500";
const KPI_VALUE = "text-2xl font-bold tracking-tight text-slate-900";

const AVAILABLE_COLUMNS = [
  "fecha",
  "paciente",
  "servicio",
  "practica",
  "odontologo",
  "pasante"
] as const;

const COLUMN_OPTIONS: ReportColumnOption[] = [
  { key: "fecha", label: "Fecha" },
  { key: "paciente", label: "Paciente" },
  { key: "servicio", label: "Servicio" },
  { key: "practica", label: "Práctica realizada" },
  { key: "odontologo", label: "Odontólogo" },
  { key: "pasante", label: "Pasante" }
];

function formatPacienteLine(dni: string, nombre: string) {
  return `${dni} - ${nombre}`;
}

export function ClinicalReportsPanel() {
  const [practicas, setPracticas] = useState<PracticaClinica[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [pasantes, setPasantes] = useState<Pasante[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState("");

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [servicioFilter, setServicioFilter] = useState("todos");
  const [odontologoFilter, setOdontologoFilter] = useState("todos");
  const [pasanteFilter, setPasanteFilter] = useState("todos");
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() =>
    createVisibleColumns([...AVAILABLE_COLUMNS])
  );

  function toggleColumn(key: string) {
    setVisibleColumns((prev) => {
      const enabledCount = Object.values(prev).filter(Boolean).length;
      if (prev[key] && enabledCount <= 1) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  }

  const visibleColumnCount = useMemo(
    () => COLUMN_OPTIONS.filter((column) => visibleColumns[column.key]).length,
    [visibleColumns]
  );

  async function loadData() {
    setLoading(true);
    setDbError("");
    try {
      const [pc, prof, serv, pas] = await Promise.all([
        getPracticasClinicas(),
        getProfesionales(),
        getServicios(),
        getPasantes()
      ]);
      setPracticas(pc);
      setProfesionales(prof);
      setServicios(serv);
      setPasantes(pas);
    } catch (e) {
      console.error("Error al cargar reporte clínico", e);
      setDbError((e as Error).message || "No se pudo conectar con Supabase.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const odontologosEnDatos = useMemo(() => {
    const set = new Set<string>();
    practicas.forEach((p) => {
      if (p.odontologoResponsable?.trim()) set.add(p.odontologoResponsable.trim());
    });
    profesionales.forEach((p) => set.add(p.nombreCompleto));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [practicas, profesionales]);

  const pasantesEnDatos = useMemo(() => {
    const set = new Set<string>();
    practicas.forEach((p) => {
      if (p.pasante?.trim()) set.add(p.pasante.trim());
    });
    pasantes.forEach((p) => set.add(p.nombreCompleto));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [practicas, pasantes]);

  function handleResetFilters() {
    setFechaInicio("");
    setFechaFin("");
    setServicioFilter("todos");
    setOdontologoFilter("todos");
    setPasanteFilter("todos");
    setBusquedaPaciente("");
  }

  const filtered = useMemo(() => {
    const term = busquedaPaciente.trim().toLowerCase();
    return practicas.filter((item) => {
      if (servicioFilter !== "todos" && item.servicio !== servicioFilter) return false;
      if (odontologoFilter !== "todos" && item.odontologoResponsable !== odontologoFilter) {
        return false;
      }
      if (pasanteFilter !== "todos") {
        if (pasanteFilter === "sin_pasante") {
          if (item.pasante) return false;
        } else if (item.pasante !== pasanteFilter) {
          return false;
        }
      }
      if (term) {
        const id = String(item.pacienteId || "").toLowerCase();
        const fontNombre = String(item.pacienteNombre || "").toLowerCase();
        if (!id.includes(term) && !fontNombre.includes(term)) return false;
      }
      const fecha = item.fechaAtencion.toDate();
      if (fechaInicio) {
        const start = new Date(fechaInicio);
        start.setHours(0, 0, 0, 0);
        if (fecha < start) return false;
      }
      if (fechaFin) {
        const end = new Date(fechaFin);
        end.setHours(23, 59, 59, 999);
        if (fecha > end) return false;
      }
      return true;
    });
  }, [practicas, servicioFilter, odontologoFilter, pasanteFilter, busquedaPaciente, fechaInicio, fechaFin]);

  const totals = useMemo(() => {
    const pacientes = new Set<string>();
    const porServicio: Record<string, number> = {};
    filtered.forEach((p) => {
      pacientes.add(p.pacienteId);
      porServicio[p.servicio] = (porServicio[p.servicio] ?? 0) + 1;
    });
    const servicioTop = Object.entries(porServicio).sort((a, b) => b[1] - a[1])[0];
    return {
      atenciones: filtered.length,
      pacientes: pacientes.size,
      servicioTop: servicioTop ? `${servicioTop[0]} (${servicioTop[1]})` : "—"
    };
  }, [filtered]);

  const formatDate = (ts: AppTimestamp) => formatDateEsAr(ts);

  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <section className="space-y-6">
      {dbError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 no-print">
          <p className="font-semibold">Base de datos no conectada</p>
          <p className="mt-1 font-mono text-xs">{dbError}</p>
        </div>
      )}

      {/* Cabecera Exclusiva de Impresión */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">HOSPITAL ODONTOLÓGICO</h1>
            <p className="text-xs font-semibold text-slate-500">Hospital Odontológico — Reporte de Atención Clínica</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800">Fecha de emisión: {new Date().toLocaleDateString("es-AR")}</p>
            <p className="text-3xs text-slate-400 mt-1">Generado automáticamente por el sistema</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs border-t border-slate-100 pt-3 text-slate-700">
          <div>
            <span className="font-bold text-slate-600">Período:</span> {fechaInicio ? formatDateStr(fechaInicio) : "Desde el inicio"} — {fechaFin ? formatDateStr(fechaFin) : "Hasta hoy"}
          </div>
          <div>
            <span className="font-bold text-slate-600">Odontólogo:</span> {odontologoFilter === "todos" ? "Todos" : odontologoFilter}
          </div>
          <div>
            <span className="font-bold text-slate-600">Servicio:</span> {servicioFilter === "todos" ? "Todos" : servicioFilter}
          </div>
          <div>
            <span className="font-bold text-slate-600">Pasante:</span> {pasanteFilter === "todos" ? "Todos" : pasanteFilter === "sin_pasante" ? "Sin pasante" : pasanteFilter}
          </div>
          <div className="col-span-2">
            <span className="font-bold text-slate-600">Paciente filtrado:</span> {busquedaPaciente ? busquedaPaciente : "Todos los pacientes"}
          </div>
        </div>
      </div>

      <div className="no-print">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Reporte de atención clínica</h2>
        <p className="mt-1 text-sm text-slate-500">
          Prácticas registradas en consultorio, sin montos ni facturación.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm no-print">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className={FILTER_LABEL}>Fecha desde</label>
            <input
              type="date"
              className={FILTER_INPUT}
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>
          <div>
            <label className={FILTER_LABEL}>Fecha hasta</label>
            <input
              type="date"
              className={FILTER_INPUT}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>
          <div>
            <label className={FILTER_LABEL}>Servicio</label>
            <select
              className={FILTER_INPUT}
              value={servicioFilter}
              onChange={(e) => setServicioFilter(e.target.value)}
            >
              <option value="todos">Todos</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.nombre}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={FILTER_LABEL}>Odontólogo responsable</label>
            <select
              className={FILTER_INPUT}
              value={odontologoFilter}
              onChange={(e) => setOdontologoFilter(e.target.value)}
            >
              <option value="todos">Todos</option>
              {odontologosEnDatos.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={FILTER_LABEL}>Pasante</label>
            <select
              className={FILTER_INPUT}
              value={pasanteFilter}
              onChange={(e) => setPasanteFilter(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="sin_pasante">Sin pasante</option>
              {pasantesEnDatos.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={FILTER_LABEL}>Paciente (DNI o nombre)</label>
            <input
              className={FILTER_INPUT}
              placeholder="Buscar..."
              value={busquedaPaciente}
              onChange={(e) => setBusquedaPaciente(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <ReportColumnSelector
            columns={COLUMN_OPTIONS}
            visibleColumns={visibleColumns}
            onToggle={toggleColumn}
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Actualizar"}
          </button>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <div className="no-print grid gap-4 sm:grid-cols-3">
        <div className={KPI_CARD}>
          <p className={KPI_LABEL}>Prácticas registradas</p>
          <p className={KPI_VALUE}>{totals.atenciones}</p>
        </div>
        <div className={KPI_CARD}>
          <p className={KPI_LABEL}>Pacientes atendidos</p>
          <p className={KPI_VALUE}>{totals.pacientes}</p>
        </div>
        <div className={KPI_CARD}>
          <p className={KPI_LABEL}>Servicio más frecuente</p>
          <p className="text-lg font-bold leading-snug tracking-tight text-slate-900">{totals.servicioTop}</p>
        </div>
      </div>

      <div className="custom-scrollbar w-full max-h-[calc(100vh-320px)] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="report-spreadsheet-table w-full min-w-[1000px] table-auto border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300">
              <tr>
                {visibleColumns.fecha && <th>Fecha</th>}
                {visibleColumns.paciente && <th>Paciente</th>}
                {visibleColumns.servicio && <th>Servicio</th>}
                {visibleColumns.practica && <th>Práctica realizada</th>}
                {visibleColumns.odontologo && <th>Odontólogo</th>}
                {visibleColumns.pasante && <th>Pasante</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount} className="py-8 text-center text-slate-500">
                    {loading ? "Cargando..." : "Sin atenciones con los filtros aplicados."}
                  </td>
                </tr>
              ) : (
                filtered.map((p, i) => (
                  <tr key={p.id || `${p.pacienteId}-${i}`} className="hover:bg-slate-100/60">
                    {visibleColumns.fecha && (
                      <td className="text-slate-600">{formatDate(p.fechaAtencion)}</td>
                    )}
                    {visibleColumns.paciente && (
                      <td className="font-medium">
                        {formatPacienteLine(String(p.pacienteId), p.pacienteNombre)}
                      </td>
                    )}
                    {visibleColumns.servicio && <td className="text-slate-600">{p.servicio}</td>}
                    {visibleColumns.practica && (
                      <td className="font-medium">{p.practicaRealizada}</td>
                    )}
                    {visibleColumns.odontologo && (
                      <td className="text-slate-600">{p.odontologoResponsable}</td>
                    )}
                    {visibleColumns.pasante && (
                      <td className="text-slate-600">{p.pasante || "—"}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
      </div>
    </section>
  );
}
