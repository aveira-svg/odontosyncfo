"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createVisibleColumns,
  ReportColumnSelector,
  type ReportColumnOption
} from "@/components/report-column-selector";
import { esFacturacionVigente } from "@/lib/facturacion-utils";
import { getFacturacion, getProfesionales, getServicios } from "@/lib/supabase-service";
import type { Facturacion, Profesional, Servicio } from "@/types";
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
  "recibo",
  "fecha",
  "paciente",
  "profesional",
  "servicio",
  "practica",
  "total",
  "abonado",
  "pendiente",
  "estado"
] as const;

const COLUMN_OPTIONS: ReportColumnOption[] = [
  { key: "recibo", label: "Recibo" },
  { key: "fecha", label: "Fecha" },
  { key: "paciente", label: "Paciente" },
  { key: "profesional", label: "Profesional" },
  { key: "servicio", label: "Servicio" },
  { key: "practica", label: "Práctica cobrada" },
  { key: "total", label: "Total" },
  { key: "abonado", label: "Abonado" },
  { key: "pendiente", label: "Pendiente" },
  { key: "estado", label: "Estado" }
];

function formatPacienteLine(dni: string, nombre: string) {
  return `${dni} - ${nombre}`;
}

export function BillingReportsPanel() {
  const [invoices, setInvoices] = useState<Facturacion[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState("");

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [profesionalFilter, setProfesionalFilter] = useState("todos");
  const [servicioFilter, setServicioFilter] = useState("todos");
  const [soloDeudores, setSoloDeudores] = useState(false);
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
      const [inv, prof, serv] = await Promise.all([
        getFacturacion(),
        getProfesionales(),
        getServicios()
      ]);
      setInvoices(inv);
      setProfesionales(prof);
      setServicios(serv);
    } catch (e) {
      console.error("Error al cargar reporte de facturación", e);
      setDbError((e as Error).message || "No se pudo conectar con Supabase.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const profesionalNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    profesionales.forEach((p) => {
      map[p.id] = p.nombreCompleto;
    });
    return map;
  }, [profesionales]);

  function handleResetFilters() {
    setFechaInicio("");
    setFechaFin("");
    setProfesionalFilter("todos");
    setServicioFilter("todos");
    setSoloDeudores(false);
  }

  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      if (!esFacturacionVigente(item)) return false;
      if (soloDeudores && (item.saldoPendiente <= 0 || item.estado === "PAGADA")) return false;
      if (profesionalFilter !== "todos" && item.profesionalId !== profesionalFilter) return false;
      if (servicioFilter !== "todos" && item.servicioAsociado !== servicioFilter) return false;
      if (fechaInicio) {
        const start = new Date(fechaInicio);
        start.setHours(0, 0, 0, 0);
        if (item.fecha.toDate() < start) return false;
      }
      if (fechaFin) {
        const end = new Date(fechaFin);
        end.setHours(23, 59, 59, 999);
        if (item.fecha.toDate() > end) return false;
      }
      return true;
    });
  }, [invoices, soloDeudores, profesionalFilter, servicioFilter, fechaInicio, fechaFin]);

  const totals = useMemo(() => {
    let facturado = 0;
    let recaudado = 0;
    let deudas = 0;
    filteredInvoices.forEach((x) => {
      facturado += x.costoTotal;
      recaudado += x.montoAbonado;
      deudas += x.saldoPendiente;
    });
    return { facturado, recaudado, deudas, recibos: filteredInvoices.length };
  }, [filteredInvoices]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2
    }).format(val);

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
            <p className="text-xs font-semibold text-slate-500">Hospital Odontológico — Reporte de Facturación</p>
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
            <span className="font-bold text-slate-600">Odontólogo (caja):</span> {profesionalFilter === "todos" ? "Todos" : profesionalNameMap[profesionalFilter] || profesionalFilter}
          </div>
          <div>
            <span className="font-bold text-slate-600">Servicio:</span> {servicioFilter === "todos" ? "Todos" : servicioFilter}
          </div>
          <div>
            <span className="font-bold text-slate-600">Estado:</span> {soloDeudores ? "Solo recibos con saldo pendiente" : "Todos los recibos"}
          </div>
        </div>
      </div>

      <div className="no-print">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Reporte de facturación</h2>
        <p className="mt-1 text-sm text-slate-500">
          Cobros, recaudación y deudas. Los recibos eliminados no se incluyen.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm no-print">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <label className={FILTER_LABEL}>Odontólogo (caja)</label>
            <select
              className={FILTER_INPUT}
              value={profesionalFilter}
              onChange={(e) => setProfesionalFilter(e.target.value)}
            >
              <option value="todos">Todos</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombreCompleto}
                </option>
              ))}
            </select>
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
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={soloDeudores}
              onChange={(e) => setSoloDeudores(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-slate-700">Solo recibos con saldo pendiente</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
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
      </div>

      <div className="no-print grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={KPI_CARD}>
          <p className={KPI_LABEL}>Recibos</p>
          <p className={KPI_VALUE}>{totals.recibos}</p>
        </div>
        <div className={KPI_CARD}>
          <p className={KPI_LABEL}>Total facturado</p>
          <p className={KPI_VALUE}>{formatCurrency(totals.facturado)}</p>
        </div>
        <div className={KPI_CARD}>
          <p className={KPI_LABEL}>Total recaudado</p>
          <p className="text-2xl font-bold tracking-tight text-emerald-700">
            {formatCurrency(totals.recaudado)}
          </p>
        </div>
        <div className={KPI_CARD}>
          <p className={KPI_LABEL}>Deuda pendiente</p>
          <p className="text-2xl font-bold tracking-tight text-rose-700">
            {formatCurrency(totals.deudas)}
          </p>
        </div>
      </div>

      <div className="custom-scrollbar w-full max-h-[calc(100vh-320px)] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="report-spreadsheet-table w-full min-w-[1200px] table-auto border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-300">
              <tr>
                {visibleColumns.recibo && <th>Recibo</th>}
                {visibleColumns.fecha && <th>Fecha</th>}
                {visibleColumns.paciente && <th>Paciente</th>}
                {visibleColumns.profesional && <th>Profesional</th>}
                {visibleColumns.servicio && <th>Servicio</th>}
                {visibleColumns.practica && <th>Práctica cobrada</th>}
                {visibleColumns.total && <th className="text-right">Total</th>}
                {visibleColumns.abonado && <th className="text-right">Abonado</th>}
                {visibleColumns.pendiente && <th className="text-right">Pendiente</th>}
                {visibleColumns.estado && <th className="text-center">Estado</th>}
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumnCount} className="py-8 text-center text-slate-500">
                    {loading ? "Cargando..." : "Sin registros con los filtros aplicados."}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((r, i) => {
                  const isDeudor = r.saldoPendiente > 0 && r.estado !== "PAGADA";
                  const estadoLabel =
                    r.estado === "PARCIAL" ? "PARCIAL" : isDeudor ? "DEUDA" : "PAGADO";

                  return (
                    <tr key={r.id || `${r.pacienteId}-${i}`} className="hover:bg-slate-100/60">
                      {visibleColumns.recibo && (
                        <td className="font-mono text-slate-600">{r.id}</td>
                      )}
                      {visibleColumns.fecha && <td className="text-slate-600">{formatDate(r.fecha)}</td>}
                      {visibleColumns.paciente && (
                        <td className="font-medium">
                          {formatPacienteLine(String(r.pacienteId), r.pacienteNombre)}
                        </td>
                      )}
                      {visibleColumns.profesional && (
                        <td className="text-slate-600">
                          {profesionalNameMap[r.profesionalId] || r.profesionalId || "—"}
                        </td>
                      )}
                      {visibleColumns.servicio && <td className="text-slate-600">{r.servicioAsociado}</td>}
                      {visibleColumns.practica && (
                        <td className="text-slate-600" title={r.practicaCobradaDetalle}>
                          {r.practicaCobradaDetalle}
                        </td>
                      )}
                      {visibleColumns.total && (
                        <td className="text-right font-medium">{formatCurrency(r.costoTotal)}</td>
                      )}
                      {visibleColumns.abonado && (
                        <td className="text-right font-medium text-emerald-700">
                          {formatCurrency(r.montoAbonado)}
                        </td>
                      )}
                      {visibleColumns.pendiente && (
                        <td
                          className={`text-right font-medium ${isDeudor ? "text-rose-700" : "text-slate-600"}`}
                        >
                          {formatCurrency(r.saldoPendiente)}
                        </td>
                      )}
                      {visibleColumns.estado && (
                        <td className="text-center font-semibold text-slate-700">{estadoLabel}</td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>
    </section>
  );
}
