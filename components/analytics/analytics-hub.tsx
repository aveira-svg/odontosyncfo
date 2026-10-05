"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getFacturacion,
  getPracticasClinicas,
  getProfesionales,
  getServicios,
  getAllPacientes
} from "@/lib/supabase-service";
import { esFacturacionVigente } from "@/lib/facturacion-utils";
import type { Facturacion, PracticaClinica, Profesional, Servicio, Paciente } from "@/types";
import {
  type Granularity,
  type AgeGroup,
  type ProcedenciaCategory,
  GRANULARITY_OPTIONS,
  AGE_GROUP_CONFIG,
  PROCEDENCIA_CONFIG,
  calculateAge,
  getAgeGroup,
  classifyProcedencia,
  aggregateBillingData,
  aggregateClinicalData,
  getPeriodData,
  isPracticaExcluida,
  type BillingGroupRow,
  type ClinicalGroupRow
} from "@/lib/analytics-utils";
import {
  AnalyticsLineBarChart,
  AnalyticsHorizontalBarChart,
  AnalyticsDonutChart
} from "@/components/analytics/analytics-charts";
import { ReportPagination, type PageSizeOption } from "@/components/report-pagination";
import { useAuth } from "@/components/auth-provider";
import {
  BarChart3,
  Stethoscope,
  Filter,
  Printer,
  RefreshCw,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Info
} from "lucide-react";

type TabMode = "facturacion" | "clinica";

interface PrintConfig {
  kpis: boolean;
  totalPendiente: boolean;
  table: boolean;
  timeSeriesChart: boolean;
  serviceChart: boolean;
  demographicsChart: boolean;
}

const FILTER_LABEL = "mb-1 block text-3xs font-extrabold uppercase tracking-wider text-slate-500";
const FILTER_INPUT =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm focus:border-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-700 font-medium";

/**
 * Detecta si un servicio corresponde a atención gratuita de pacientes con discapacidad.
 */
function isServicioGratuitoDiscapacidad(servicioNombre?: string): boolean {
  if (!servicioNombre) return false;
  const norm = servicioNombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return norm.includes("discapacidad");
}

export function AnalyticsHub() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabMode>("facturacion");

  // Raw data state
  const [invoices, setInvoices] = useState<Facturacion[]>([]);
  const [practicas, setPracticas] = useState<PracticaClinica[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState("");

  // Global filters
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("mes");
  const [servicioFilter, setServicioFilter] = useState("todos");
  const [profesionalFilter, setProfesionalFilter] = useState("todos");
  const [practicaQuery, setPracticaQuery] = useState("");
  const [grupoEtarioFilter, setGrupoEtarioFilter] = useState<AgeGroup | "todos">("todos");
  const [procedenciaFilter, setProcedenciaFilter] = useState<ProcedenciaCategory | "todos">("todos");
  const [mostrarProfesional, setMostrarProfesional] = useState(true);

  // Print selection config (Quiero elegir qué imprimir)
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printConfig, setPrintConfig] = useState<PrintConfig>({
    kpis: true,
    totalPendiente: true,
    table: true,
    timeSeriesChart: true,
    serviceChart: true,
    demographicsChart: true
  });

  // Pagination for grouped tables
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSizeOption>(100);

  // Load all data
  async function loadAllData() {
    setLoading(true);
    setDbError("");
    try {
      const [inv, pc, prof, serv, pac] = await Promise.all([
        getFacturacion(),
        getPracticasClinicas(),
        getProfesionales(),
        getServicios(),
        getAllPacientes()
      ]);
      setInvoices(inv);
      setPracticas(pc);
      setProfesionales(prof);
      setServicios(serv);
      setPacientes(pac);
    } catch (e) {
      console.error("Error al cargar módulo analítico", e);
      setDbError((e as Error).message || "No se pudo conectar con Supabase.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAllData();
  }, []);

  // Maps for quick lookups
  const profesionalNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    profesionales.forEach((p) => {
      map[p.id] = p.nombreCompleto;
    });
    return map;
  }, [profesionales]);

  const patientMap = useMemo(() => {
    const map: Record<string, { ageGroup: AgeGroup; procedencia: ProcedenciaCategory }> = {};
    pacientes.forEach((p) => {
      const age = calculateAge(p.fechaNacimiento);
      const ageGroup = getAgeGroup(age);
      const procedencia = classifyProcedencia(p.direccion);
      map[p.id] = { ageGroup, procedencia };
    });
    return map;
  }, [pacientes]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    fechaInicio,
    fechaFin,
    granularity,
    servicioFilter,
    profesionalFilter,
    practicaQuery,
    grupoEtarioFilter,
    procedenciaFilter,
    mostrarProfesional,
    activeTab
  ]);

  // Date range presets
  function applyDatePreset(preset: "hoy" | "este_mes" | "este_trimestre" | "este_anio" | "todo") {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const formatD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === "hoy") {
      const todayStr = formatD(now);
      setFechaInicio(todayStr);
      setFechaFin(todayStr);
    } else if (preset === "este_mes") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFechaInicio(formatD(firstDay));
      setFechaFin(formatD(lastDay));
    } else if (preset === "este_trimestre") {
      const q = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), q * 3, 1);
      const lastDay = new Date(now.getFullYear(), q * 3 + 3, 0);
      setFechaInicio(formatD(firstDay));
      setFechaFin(formatD(lastDay));
    } else if (preset === "este_anio") {
      const firstDay = new Date(now.getFullYear(), 0, 1);
      const lastDay = new Date(now.getFullYear(), 11, 31);
      setFechaInicio(formatD(firstDay));
      setFechaFin(formatD(lastDay));
    } else if (preset === "todo") {
      setFechaInicio("");
      setFechaFin("");
    }
  }

  function handleResetFilters() {
    setFechaInicio("");
    setFechaFin("");
    setGranularity("mes");
    setServicioFilter("todos");
    setProfesionalFilter("todos");
    setPracticaQuery("");
    setGrupoEtarioFilter("todos");
    setProcedenciaFilter("todos");
    setMostrarProfesional(true);
    setCurrentPage(1);
  }

  // Print selection helpers
  function togglePrintItem(key: keyof PrintConfig) {
    setPrintConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function setPrintPreset(preset: "all" | "table_only" | "charts_only" | "kpis_only") {
    if (preset === "all") {
      setPrintConfig({
        kpis: true,
        totalPendiente: true,
        table: true,
        timeSeriesChart: true,
        serviceChart: true,
        demographicsChart: true
      });
    } else if (preset === "table_only") {
      setPrintConfig({
        kpis: true,
        totalPendiente: true,
        table: true,
        timeSeriesChart: false,
        serviceChart: false,
        demographicsChart: false
      });
    } else if (preset === "charts_only") {
      setPrintConfig({
        kpis: false,
        totalPendiente: false,
        table: false,
        timeSeriesChart: true,
        serviceChart: true,
        demographicsChart: true
      });
    } else if (preset === "kpis_only") {
      setPrintConfig({
        kpis: true,
        totalPendiente: true,
        table: false,
        timeSeriesChart: false,
        serviceChart: false,
        demographicsChart: false
      });
    }
  }

  // --- Filtered Datasets ---

  const filteredInvoices = useMemo(() => {
    const query = practicaQuery.trim().toLowerCase();
    return invoices.filter((item) => {
      if (!esFacturacionVigente(item)) return false;
      if (isPracticaExcluida(item.practicaCobradaDetalle)) return false;
      if (servicioFilter !== "todos" && item.servicioAsociado !== servicioFilter) return false;
      if (profesionalFilter !== "todos" && item.profesionalId !== profesionalFilter) return false;
      if (query && !item.practicaCobradaDetalle.toLowerCase().includes(query)) return false;

      // Filtro demográfico
      const patientData = patientMap[item.pacienteId];
      if (grupoEtarioFilter !== "todos") {
        if (!patientData || patientData.ageGroup !== grupoEtarioFilter) return false;
      }
      if (procedenciaFilter !== "todos") {
        if (!patientData || patientData.procedencia !== procedenciaFilter) return false;
      }

      // Rango de fechas
      const fecha = item.fecha.toDate();
      if (fechaInicio) {
        const [y, m, d] = fechaInicio.split("-").map(Number);
        const start = new Date(y, m - 1, d, 0, 0, 0, 0);
        if (fecha < start) return false;
      }
      if (fechaFin) {
        const [y, m, d] = fechaFin.split("-").map(Number);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        if (fecha > end) return false;
      }
      return true;
    });
  }, [
    invoices,
    servicioFilter,
    profesionalFilter,
    practicaQuery,
    grupoEtarioFilter,
    procedenciaFilter,
    patientMap,
    fechaInicio,
    fechaFin
  ]);

  const filteredPracticas = useMemo(() => {
    const query = practicaQuery.trim().toLowerCase();
    return practicas.filter((item) => {
      // Excluir "PACIENTE ATENDIDO" de las estadísticas asistenciales
      if (isPracticaExcluida(item.practicaRealizada)) return false;
      if (servicioFilter !== "todos" && item.servicio !== servicioFilter) return false;
      if (
        profesionalFilter !== "todos" &&
        item.odontologoResponsable !== profesionalNameMap[profesionalFilter] &&
        item.odontologoResponsable !== profesionalFilter
      ) {
        return false;
      }
      if (query && !item.practicaRealizada.toLowerCase().includes(query)) return false;

      // Demografía
      const patientData = patientMap[item.pacienteId];
      if (grupoEtarioFilter !== "todos") {
        if (!patientData || patientData.ageGroup !== grupoEtarioFilter) return false;
      }
      if (procedenciaFilter !== "todos") {
        if (!patientData || patientData.procedencia !== procedenciaFilter) return false;
      }

      // Rango de fechas basado en fecha_atencion de practicas_clinicas
      const fecha = item.fechaAtencion.toDate();
      if (fechaInicio) {
        const [y, m, d] = fechaInicio.split("-").map(Number);
        const start = new Date(y, m - 1, d, 0, 0, 0, 0);
        if (fecha < start) return false;
      }
      if (fechaFin) {
        const [y, m, d] = fechaFin.split("-").map(Number);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        if (fecha > end) return false;
      }
      return true;
    });
  }, [
    practicas,
    servicioFilter,
    profesionalFilter,
    practicaQuery,
    grupoEtarioFilter,
    procedenciaFilter,
    patientMap,
    profesionalNameMap,
    fechaInicio,
    fechaFin
  ]);

  // --- Facturación: Métricas y Agregaciones ---

  const billingKPIs = useMemo(() => {
    let totalRecaudado = 0;
    let totalFacturado = 0;
    let totalPendiente = 0;
    const uniquePatientsAll = new Set<string>();
    const uniquePatientsArancelados = new Set<string>();
    const uniquePatientsDiscapacidad = new Set<string>();
    const activeDays = new Set<string>();
    const dayPatientsMap = new Map<string, Set<string>>();
    let recaudadoArancelado = 0;

    filteredInvoices.forEach((inv) => {
      const abonado = inv.montoAbonado || 0;
      const costo = inv.costoTotal || 0;
      const pendiente = inv.saldoPendiente || 0;

      totalRecaudado += abonado;
      totalFacturado += costo;
      totalPendiente += pendiente;
      uniquePatientsAll.add(inv.pacienteId);

      const d = inv.fecha.toDate();
      const pad = (n: number) => String(n).padStart(2, "0");
      const dayKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      activeDays.add(dayKey);
      if (!dayPatientsMap.has(dayKey)) {
        dayPatientsMap.set(dayKey, new Set<string>());
      }
      dayPatientsMap.get(dayKey)!.add(inv.pacienteId);

      // Discriminación del servicio gratuito de discapacidad
      if (isServicioGratuitoDiscapacidad(inv.servicioAsociado)) {
        uniquePatientsDiscapacidad.add(inv.pacienteId);
      } else {
        uniquePatientsArancelados.add(inv.pacienteId);
        recaudadoArancelado += abonado;
      }
    });

    const totalPacientesCount = uniquePatientsAll.size;
    const aranceladosCount = uniquePatientsArancelados.size;
    const discapacidadCount = uniquePatientsDiscapacidad.size;
    const diasCount = activeDays.size || 1;

    let totalDailyUniquePatients = 0;
    dayPatientsMap.forEach((pSet) => {
      totalDailyUniquePatients += pSet.size;
    });

    // Promedio de pacientes únicos facturados por día
    const promedioPacientesUnicosDiarios =
      diasCount > 0 ? (totalDailyUniquePatients / diasCount).toFixed(1) : "0";

    // Facturación / Recaudación promedio por paciente excluyendo servicio gratuito
    const promedioFacturacionPorPaciente =
      aranceladosCount > 0 ? recaudadoArancelado / aranceladosCount : 0;

    // Cantidad promedio de prácticas realizadas por paciente
    const promedioPracticasPorPaciente =
      totalPacientesCount > 0 ? (filteredInvoices.length / totalPacientesCount).toFixed(1) : "0";

    return {
      totalRecaudado,
      totalFacturado,
      promedioFacturacionPorPaciente,
      pacientesUnicosTotal: totalPacientesCount,
      pacientesAranceladosCount: aranceladosCount,
      pacientesDiscapacidadCount: discapacidadCount,
      promedioPracticasPorPaciente,
      promedioPacientesUnicosDiarios,
      diasActivosCount: diasCount,
      totalPendiente,
      recibosCount: filteredInvoices.length
    };
  }, [filteredInvoices]);

  const billingGroupedRows: BillingGroupRow[] = useMemo(() => {
    return aggregateBillingData(filteredInvoices, granularity, mostrarProfesional, profesionalNameMap);
  }, [filteredInvoices, granularity, mostrarProfesional, profesionalNameMap]);

  const billingTotals = useMemo(() => {
    let totalPracticas = 0;
    let totalRecaudado = 0;
    let totalCosto = 0;
    let totalPendiente = 0;
    billingGroupedRows.forEach((r) => {
      totalPracticas += r.cantidadPracticas;
      totalRecaudado += r.recaudadoTotal;
      totalCosto += r.costoTotal;
      totalPendiente += r.saldoPendiente;
    });
    return { totalPracticas, totalRecaudado, totalCosto, totalPendiente };
  }, [billingGroupedRows]);

  const paginatedBillingRows = useMemo(() => {
    if (pageSize === "todos") return billingGroupedRows;
    const start = (currentPage - 1) * pageSize;
    return billingGroupedRows.slice(start, start + pageSize);
  }, [billingGroupedRows, currentPage, pageSize]);

  // Facturación: Datos para gráficos
  const billingTimeSeries = useMemo(() => {
    const map: Record<string, { label: string; sortKey: string; value: number }> = {};
    filteredInvoices.forEach((inv) => {
      const p = getPeriodData(inv.fecha.toDate(), granularity);
      if (!map[p.key]) {
        map[p.key] = { label: p.label, sortKey: p.sortKey, value: 0 };
      }
      map[p.key].value += inv.montoAbonado || 0;
    });
    return Object.entries(map)
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
      .map(([key, data]) => ({ key, label: data.label, value: data.value }));
  }, [filteredInvoices, granularity]);

  const billingServiceSeries = useMemo(() => {
    const map: Record<string, number> = {};
    filteredInvoices.forEach((inv) => {
      const serv = inv.servicioAsociado || "General";
      map[serv] = (map[serv] || 0) + (inv.montoAbonado || 0);
    });
    return Object.entries(map).map(([id, value]) => ({ id, label: id, value }));
  }, [filteredInvoices]);

  const billingAgeGroupSeries = useMemo(() => {
    const map: Record<string, number> = {};
    const patientAges = new Set<string>();
    filteredInvoices.forEach((inv) => {
      if (!patientAges.has(inv.pacienteId)) {
        patientAges.add(inv.pacienteId);
        const data = patientMap[inv.pacienteId];
        const group = data?.ageGroup || "desconocido";
        map[group] = (map[group] || 0) + 1;
      }
    });
    return AGE_GROUP_CONFIG.map((cfg) => ({
      id: cfg.id,
      label: cfg.label,
      value: map[cfg.id] || 0
    }));
  }, [filteredInvoices, patientMap]);

  const billingProcedenciaSeries = useMemo(() => {
    const map: Record<string, number> = {};
    const patientProcs = new Set<string>();
    filteredInvoices.forEach((inv) => {
      if (!patientProcs.has(inv.pacienteId)) {
        patientProcs.add(inv.pacienteId);
        const data = patientMap[inv.pacienteId];
        const proc = data?.procedencia || "sin_especificar";
        map[proc] = (map[proc] || 0) + 1;
      }
    });
    return PROCEDENCIA_CONFIG.map((cfg) => ({
      id: cfg.id,
      label: cfg.label,
      value: map[cfg.id] || 0
    }));
  }, [filteredInvoices, patientMap]);

  // --- Atención Clínica: Métricas y Agregaciones ---

  const clinicalKPIs = useMemo(() => {
    const uniquePatients = new Set<string>();
    const activeDays = new Set<string>();
    const activePeriods = new Set<string>();
    const dayPatientsMap = new Map<string, Set<string>>();

    filteredPracticas.forEach((p) => {
      uniquePatients.add(p.pacienteId);
      const d = p.fechaAtencion.toDate();
      const pad = (n: number) => String(n).padStart(2, "0");
      const dayKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      activeDays.add(dayKey);

      if (!dayPatientsMap.has(dayKey)) {
        dayPatientsMap.set(dayKey, new Set<string>());
      }
      dayPatientsMap.get(dayKey)!.add(p.pacienteId);

      const period = getPeriodData(d, granularity);
      activePeriods.add(period.key);
    });

    const totalAtenciones = filteredPracticas.length;
    const pacientesCount = uniquePatients.size;
    const diasCount = activeDays.size || 1;
    const periodCount = activePeriods.size || 1;

    let totalDailyUniquePatients = 0;
    dayPatientsMap.forEach((pSet) => {
      totalDailyUniquePatients += pSet.size;
    });

    // Promedio de pacientes únicos atendidos por día activo
    const promedioPacientesUnicosDiarios =
      diasCount > 0 ? (totalDailyUniquePatients / diasCount).toFixed(1) : "0";

    // Promedio de atenciones por paciente único
    const promedioPracticasPorPaciente =
      pacientesCount > 0 ? (totalAtenciones / pacientesCount).toFixed(1) : "0";

    // Promedio de atenciones diarias
    const promedioDiario = totalAtenciones > 0 ? (totalAtenciones / diasCount).toFixed(1) : "0";

    // Promedio asistencial por período según granularidad
    const promedioPeriodico = totalAtenciones > 0 ? (totalAtenciones / periodCount).toFixed(1) : "0";

    return {
      totalAtenciones,
      pacientesUnicos: pacientesCount,
      promedioPracticasPorPaciente,
      promedioPacientesUnicosDiarios,
      promedioDiario,
      diasActivosCount: diasCount,
      promedioPeriodico,
      periodosActivos: periodCount
    };
  }, [filteredPracticas, granularity]);

  const clinicalGroupedRows: ClinicalGroupRow[] = useMemo(() => {
    return aggregateClinicalData(filteredPracticas, granularity, mostrarProfesional);
  }, [filteredPracticas, granularity, mostrarProfesional]);

  const clinicalTotals = useMemo(() => {
    let totalAtenciones = 0;
    clinicalGroupedRows.forEach((r) => {
      totalAtenciones += r.totalAtenciones;
    });
    return { totalAtenciones };
  }, [clinicalGroupedRows]);

  const paginatedClinicalRows = useMemo(() => {
    if (pageSize === "todos") return clinicalGroupedRows;
    const start = (currentPage - 1) * pageSize;
    return clinicalGroupedRows.slice(start, start + pageSize);
  }, [clinicalGroupedRows, currentPage, pageSize]);

  // Atención Clínica: Gráficos
  const clinicalTimeSeries = useMemo(() => {
    const map: Record<string, { label: string; sortKey: string; value: number }> = {};
    filteredPracticas.forEach((p) => {
      const period = getPeriodData(p.fechaAtencion.toDate(), granularity);
      if (!map[period.key]) {
        map[period.key] = { label: period.label, sortKey: period.sortKey, value: 0 };
      }
      map[period.key].value += 1;
    });
    return Object.entries(map)
      .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
      .map(([key, data]) => ({ key, label: data.label, value: data.value }));
  }, [filteredPracticas, granularity]);

  const clinicalServiceSeries = useMemo(() => {
    const map: Record<string, number> = {};
    filteredPracticas.forEach((p) => {
      const serv = p.servicio || "General";
      map[serv] = (map[serv] || 0) + 1;
    });
    return Object.entries(map).map(([id, value]) => ({ id, label: id, value }));
  }, [filteredPracticas]);

  const clinicalAgeGroupSeries = useMemo(() => {
    const map: Record<string, number> = {};
    const patientAges = new Set<string>();
    filteredPracticas.forEach((p) => {
      if (!patientAges.has(p.pacienteId)) {
        patientAges.add(p.pacienteId);
        const data = patientMap[p.pacienteId];
        const group = data?.ageGroup || "desconocido";
        map[group] = (map[group] || 0) + 1;
      }
    });
    return AGE_GROUP_CONFIG.map((cfg) => ({
      id: cfg.id,
      label: cfg.label,
      value: map[cfg.id] || 0
    }));
  }, [filteredPracticas, patientMap]);

  const clinicalProcedenciaSeries = useMemo(() => {
    const map: Record<string, number> = {};
    const patientProcs = new Set<string>();
    filteredPracticas.forEach((p) => {
      if (!patientProcs.has(p.pacienteId)) {
        patientProcs.add(p.pacienteId);
        const data = patientMap[p.pacienteId];
        const proc = data?.procedencia || "sin_especificar";
        map[proc] = (map[proc] || 0) + 1;
      }
    });
    return PROCEDENCIA_CONFIG.map((cfg) => ({
      id: cfg.id,
      label: cfg.label,
      value: map[cfg.id] || 0
    }));
  }, [filteredPracticas, patientMap]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2
    }).format(val);

  const formatDateStr = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const currentGranularityLabel =
    GRANULARITY_OPTIONS.find((g) => g.id === granularity)?.label || "Mes";

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {dbError && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 font-semibold no-print shadow-sm">
          <p className="font-bold">Aviso de conexión a base de datos:</p>
          <p className="mt-0.5 font-mono">{dbError}</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 1 IMPRESIÓN: PORTADA INSTITUCIONAL EJECUTIVA CON METADATOS Y KPIS */}
      {/* (Finaliza con salto de página obligatorio en A4 Landscape) */}
      {/* ========================================================================= */}
      <div className="hidden print:flex print:flex-col print:justify-between print-page-break print:min-h-[92vh] print:p-2">
        {/* Cabecera Superior de Portada con Emblema UNNE / FOUNNE */}
        <div>
          <div className="border-b-4 border-[#003366] pb-4 mb-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#003366] text-white font-black text-2xl border-2 border-slate-900 shadow-sm">
                  FO
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-[#003366]">
                    Universidad Nacional del Nordeste
                  </h2>
                  <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase leading-tight">
                    FACULTAD DE ODONTOLOGÍA
                  </h1>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Hospital Odontológico Universitario
                  </p>
                </div>
              </div>

              <div className="text-right border-l-2 border-slate-300 pl-4">
                <p className="text-3xs font-bold text-slate-600">
                  Emisión: {new Date().toLocaleDateString("es-AR")} — {new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
                </p>
                <p className="text-3xs text-slate-500 font-mono mt-0.5">
                  Emisor: <strong className="text-slate-800">{user?.email || "Administración FOUNNE"}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Título Principal de la Portada */}
          <div className="my-5 rounded-xl bg-slate-50 border-2 border-slate-300 p-4 text-center shadow-none">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
              Informe Gerencial y Estadístico — Decanato / Dirección de Hospital
            </p>
            <h2 className="text-xl font-black uppercase tracking-tight text-[#003366]">
              {activeTab === "facturacion"
                ? "Informe de Rendición de Cuentas, Facturación e Impacto Social"
                : "Informe Estadístico de Gestión Asistencial y Producción Clínica"}
            </h2>
            <p className="text-xs font-bold text-slate-700 mt-1">
              Consolidado de Prestaciones, Indicadores Asistenciales y Análisis Demográfico
            </p>
          </div>

          {/* Ficha Técnica / Metadatos de la Portada */}
          <div className="mb-6 rounded-xl border border-slate-300 bg-white p-3">
            <h3 className="text-3xs font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-1 mb-2">
              Ficha Técnica del Período y Parámetros de Consulta
            </h3>
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <span className="block text-3xs font-black uppercase text-slate-500">Período Analizado</span>
                <span className="font-bold text-slate-900">
                  {fechaInicio ? formatDateStr(fechaInicio) : "Histórico Inicial"} al {fechaFin ? formatDateStr(fechaFin) : "Hasta hoy"}
                </span>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <span className="block text-3xs font-black uppercase text-slate-500">Granularidad Temporal</span>
                <span className="font-bold text-slate-900 capitalize">{currentGranularityLabel}</span>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <span className="block text-3xs font-black uppercase text-slate-500">Servicio Seleccionado</span>
                <span className="font-bold text-slate-900 truncate block">
                  {servicioFilter === "todos" ? "Todos los Servicios" : servicioFilter}
                </span>
              </div>
              <div className="rounded bg-slate-50 p-2 border border-slate-200">
                <span className="block text-3xs font-black uppercase text-slate-500">Modalidad de Informe</span>
                <span className="font-bold text-slate-900">
                  {mostrarProfesional ? "Desglose por Docente/Operador" : "Consolidado Institucional"}
                </span>
              </div>
            </div>
          </div>

          {/* Tarjetas de Métricas, Promedios e Impacto Social (Con colores de la página web) */}
          {printConfig.kpis && (
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-800 pb-1 mb-3">
                Indicadores Clave de Desempeño (KPIs) y Promedios Asistenciales
              </h3>

              {activeTab === "facturacion" ? (
                <div className="grid grid-cols-3 gap-3">
                  {/* Fila 1 - Tarjeta 1: Total Recaudado */}
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-3 shadow-none border-l-4 border-l-[#003366]">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Total Recaudado
                    </p>
                    <p className="text-lg font-black tracking-tight text-[#003366] mt-1">
                      {formatCurrency(billingKPIs.totalRecaudado)}
                    </p>
                    <p className="text-3xs font-semibold text-slate-500 mt-0.5">
                      {billingKPIs.recibosCount} recibos vigentes emitidos
                    </p>
                  </div>

                  {/* Fila 1 - Tarjeta 2: Facturación Promedio */}
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-3 shadow-none border-l-4 border-l-sky-600">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Promedio por Paciente
                    </p>
                    <p className="text-lg font-black tracking-tight text-sky-800 mt-1">
                      {formatCurrency(billingKPIs.promedioFacturacionPorPaciente)}
                    </p>
                    <p className="text-3xs font-semibold text-slate-500 mt-0.5 leading-tight">
                      Excluye serv. discapacidad ({billingKPIs.pacientesAranceladosCount} arancelados)
                    </p>
                  </div>

                  {/* Fila 1 - Tarjeta 3: Total Pendiente (Opcional según selector) */}
                  {printConfig.totalPendiente ? (
                    <div className="rounded-xl border-2 border-slate-300 bg-white p-3 shadow-none border-l-4 border-l-rose-600">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                        Total Pendiente
                      </p>
                      <p className="text-lg font-black tracking-tight text-rose-800 mt-1">
                        {formatCurrency(billingKPIs.totalPendiente)}
                      </p>
                      <p className="text-3xs font-semibold text-slate-500 mt-0.5">
                        Saldo activo en planes de tratamiento
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border-2 border-slate-200 bg-slate-50 p-3 shadow-none border-dashed flex items-center justify-center text-slate-400 text-3xs font-semibold">
                      Pendiente no seleccionado
                    </div>
                  )}

                  {/* Fila 2 - Tarjeta 4: Pacientes Únicos */}
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-3 shadow-none border-l-4 border-l-emerald-600">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Pacientes Únicos (Impacto Social)
                    </p>
                    <p className="text-lg font-black tracking-tight text-emerald-800 mt-1">
                      {billingKPIs.pacientesUnicosTotal}
                    </p>
                    <p className="text-3xs font-semibold text-slate-500 mt-0.5">
                      {billingKPIs.pacientesDiscapacidadCount > 0
                        ? `Incluye ${billingKPIs.pacientesDiscapacidadCount} pac. gratuitos por Discapacidad`
                        : "Beneficiarios directos del hospital"}
                    </p>
                  </div>

                  {/* Fila 2 - Tarjeta 5: Pacientes Únicos Diarios */}
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-3 shadow-none border-l-4 border-l-cyan-600">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Pacientes Únicos / Día
                    </p>
                    <p className="text-lg font-black tracking-tight text-cyan-800 mt-1">
                      {billingKPIs.promedioPacientesUnicosDiarios}
                    </p>
                    <p className="text-3xs font-semibold text-slate-500 mt-0.5">
                      Promedio diario en {billingKPIs.diasActivosCount} días activos
                    </p>
                  </div>

                  {/* Fila 2 - Tarjeta 6: Promedio de Prácticas */}
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-3 shadow-none border-l-4 border-l-violet-600">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Prom. Prácticas / Paciente
                    </p>
                    <p className="text-lg font-black tracking-tight text-violet-800 mt-1">
                      {billingKPIs.promedioPracticasPorPaciente}
                    </p>
                    <p className="text-3xs font-semibold text-slate-500 mt-0.5">
                      Prácticas facturadas por beneficiario único
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {/* Fila 1 - Tarjeta 1: Total Atenciones */}
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-3 shadow-none border-l-4 border-l-[#003366]">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Total de Atenciones
                    </p>
                    <p className="text-lg font-black tracking-tight text-[#003366] mt-1">
                      {clinicalKPIs.totalAtenciones}
                    </p>
                    <p className="text-3xs font-semibold text-slate-500 mt-0.5">
                      Prestaciones asistenciales registradas
                    </p>
                  </div>

                  {/* Fila 1 - Tarjeta 2: Pacientes Únicos */}
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-3 shadow-none border-l-4 border-l-emerald-600">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Pacientes Únicos (Impacto Social)
                    </p>
                    <p className="text-lg font-black tracking-tight text-emerald-800 mt-1">
                      {clinicalKPIs.pacientesUnicos}
                    </p>
                    <p className="text-3xs font-semibold text-slate-500 mt-0.5">
                      Personas beneficiadas con asistencia odontológica
                    </p>
                  </div>

                  {/* Fila 1 - Tarjeta 3: Promedio Prácticas / Paciente */}
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-3 shadow-none border-l-4 border-l-violet-600">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Prom. Prácticas / Paciente
                    </p>
                    <p className="text-lg font-black tracking-tight text-violet-800 mt-1">
                      {clinicalKPIs.promedioPracticasPorPaciente}
                    </p>
                    <p className="text-3xs font-semibold text-slate-500 mt-0.5">
                      Atenciones promedio por persona atendida
                    </p>
                  </div>

                  {/* Fila 2 - Tarjeta 4: Pacientes Únicos Diarios */}
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-3 shadow-none border-l-4 border-l-cyan-600">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Pacientes Únicos / Día
                    </p>
                    <p className="text-lg font-black tracking-tight text-cyan-800 mt-1">
                      {clinicalKPIs.promedioPacientesUnicosDiarios}
                    </p>
                    <p className="text-3xs font-semibold text-slate-500 mt-0.5">
                      Personas atendidas/día ({clinicalKPIs.diasActivosCount} días activos)
                    </p>
                  </div>

                  {/* Fila 2 - Tarjeta 5: Promedio Diario */}
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-3 shadow-none border-l-4 border-l-teal-600">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Promedio Diario de Atenciones
                    </p>
                    <p className="text-lg font-black tracking-tight text-teal-800 mt-1">
                      {clinicalKPIs.promedioDiario}
                    </p>
                    <p className="text-3xs font-semibold text-slate-500 mt-0.5">
                      Atenciones totales por día de actividad
                    </p>
                  </div>

                  {/* Fila 2 - Tarjeta 6: Promedio por Período */}
                  <div className="rounded-xl border-2 border-slate-300 bg-white p-3 shadow-none border-l-4 border-l-indigo-600">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                      Promedio por {currentGranularityLabel}
                    </p>
                    <p className="text-lg font-black tracking-tight text-indigo-800 mt-1">
                      {clinicalKPIs.promedioPeriodico}
                    </p>
                    <p className="text-3xs font-semibold text-slate-500 mt-0.5">
                      Atenciones por período ({clinicalKPIs.periodosActivos} períodos)
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie de Página Institucional de la Portada */}
        <div className="border-t-2 border-slate-300 pt-3 text-center text-[10px] text-slate-500 font-medium">
          <p className="font-bold text-slate-700 uppercase tracking-wider">
            Hospital Odontológico Universitario — Facultad de Odontología (UNNE)
          </p>
          <p className="mt-0.5">
            Campus Deodoro Roca, Av. Libertad 5450, Corrientes, República Argentina — Sistema OdontoSync FOUNNE
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HEADER EN PANTALLA Y SWITCH DE PESTAÑAS */}
      {/* ========================================================================= */}
      <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#003366] text-white font-black text-sm shadow-sm">
              🏛️
            </span>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                Estadísticas y Rendición de Cuentas
              </h1>
              <p className="text-xs text-slate-500 font-semibold">
                Hospital Odontológico Universitario — Facultad de Odontología (UNNE)
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls & Print Configuration */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Pestañas analíticas"
            className="inline-flex rounded-xl bg-slate-200/80 p-1 shadow-inner"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "facturacion"}
              onClick={() => setActiveTab("facturacion")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === "facturacion"
                  ? "bg-white text-[#003366] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              Facturación y Rendición
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "clinica"}
              onClick={() => setActiveTab("clinica")}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
                activeTab === "clinica"
                  ? "bg-white text-[#003366] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Stethoscope className="h-4 w-4 shrink-0" />
              Atención Clínica y Asistencia
            </button>
          </div>

          {/* Botón Configurar qué imprimir */}
          <button
            type="button"
            onClick={() => setShowPrintOptions(!showPrintOptions)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold shadow-sm transition-all ${
              showPrintOptions
                ? "border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-500/20"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            title="Elegir qué componentes incluir en la impresión"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Elegir qué imprimir</span>
          </button>

          {/* Botón Imprimir */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#003366] bg-[#003366] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-[#002244] active:scale-95 transition-all"
            title="Imprimir informe en formato A4 Paisaje con salto de página entre secciones"
          >
            <Printer className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">Imprimir Reporte A4</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PANEL SELECTOR DE ELEMENTOS A IMPRIMIR (DESPLEGABLE / CONFIGURABLE) */}
      {/* ========================================================================= */}
      {showPrintOptions && (
        <div className="no-print rounded-2xl border-2 border-sky-300 bg-sky-50/70 p-4 shadow-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200/80 pb-2">
            <div className="flex items-center gap-2 text-sky-950">
              <Printer className="h-4 w-4 text-sky-800" />
              <span className="text-xs font-black uppercase tracking-wider">
                Selección de Elementos para Impresión / PDF (A4)
              </span>
            </div>

            {/* Accesos rápidos de selección */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold">
              <span className="text-3xs text-sky-700 uppercase tracking-wider mr-1">Preajustes:</span>
              <button
                type="button"
                onClick={() => setPrintPreset("all")}
                className="rounded-md bg-white border border-sky-300 px-2 py-0.5 text-sky-900 hover:bg-sky-100"
              >
                Seleccionar Todo
              </button>
              <button
                type="button"
                onClick={() => setPrintPreset("table_only")}
                className="rounded-md bg-white border border-sky-300 px-2 py-0.5 text-sky-900 hover:bg-sky-100"
              >
                Solo Tabla y KPIs
              </button>
              <button
                type="button"
                onClick={() => setPrintPreset("charts_only")}
                className="rounded-md bg-white border border-sky-300 px-2 py-0.5 text-sky-900 hover:bg-sky-100"
              >
                Solo Gráficos
              </button>
              <button
                type="button"
                onClick={() => setPrintPreset("kpis_only")}
                className="rounded-md bg-white border border-sky-300 px-2 py-0.5 text-sky-900 hover:bg-sky-100"
              >
                Solo KPIs
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 text-xs font-semibold text-slate-800">
            <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-sky-200 cursor-pointer hover:bg-sky-100/50">
              <input
                type="checkbox"
                checked={printConfig.kpis}
                onChange={() => togglePrintItem("kpis")}
                className="rounded border-sky-400 text-[#003366] focus:ring-[#003366]"
              />
              <span>Tarjetas de KPIs</span>
            </label>

            {/* Selector específico para Total Pendiente */}
            <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-sky-200 cursor-pointer hover:bg-sky-100/50">
              <input
                type="checkbox"
                checked={printConfig.totalPendiente}
                onChange={() => togglePrintItem("totalPendiente")}
                className="rounded border-sky-400 text-[#003366] focus:ring-[#003366]"
              />
              <span>Total Pendiente</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-sky-200 cursor-pointer hover:bg-sky-100/50">
              <input
                type="checkbox"
                checked={printConfig.table}
                onChange={() => togglePrintItem("table")}
                className="rounded border-sky-400 text-[#003366] focus:ring-[#003366]"
              />
              <span>Tabla de Rendición</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-sky-200 cursor-pointer hover:bg-sky-100/50">
              <input
                type="checkbox"
                checked={printConfig.timeSeriesChart}
                onChange={() => togglePrintItem("timeSeriesChart")}
                className="rounded border-sky-400 text-[#003366] focus:ring-[#003366]"
              />
              <span>Gráfico Evolución</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-sky-200 cursor-pointer hover:bg-sky-100/50">
              <input
                type="checkbox"
                checked={printConfig.serviceChart}
                onChange={() => togglePrintItem("serviceChart")}
                className="rounded border-sky-400 text-[#003366] focus:ring-[#003366]"
              />
              <span>Gráfico por Servicio</span>
            </label>

            <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-sky-200 cursor-pointer hover:bg-sky-100/50">
              <input
                type="checkbox"
                checked={printConfig.demographicsChart}
                onChange={() => togglePrintItem("demographicsChart")}
                className="rounded border-sky-400 text-[#003366] focus:ring-[#003366]"
              />
              <span>Gráficos Demográficos</span>
            </label>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PANEL SUPERIOR DE FILTROS GLOBALES Y TEMPORALIDAD */}
      {/* ========================================================================= */}
      <div className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#003366]" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Filtros Globales y Temporalidad
            </span>
          </div>

          {/* Date Presets */}
          <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-bold">
            <span className="text-3xs text-slate-400 uppercase tracking-wider mr-1">Rango rápido:</span>
            <button
              type="button"
              onClick={() => applyDatePreset("este_mes")}
              className="rounded-md bg-slate-100 px-2 py-1 text-slate-700 hover:bg-slate-200"
            >
              Este Mes
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("este_trimestre")}
              className="rounded-md bg-slate-100 px-2 py-1 text-slate-700 hover:bg-slate-200"
            >
              Este Trimestre
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("este_anio")}
              className="rounded-md bg-slate-100 px-2 py-1 text-slate-700 hover:bg-slate-200"
            >
              Este Año
            </button>
            <button
              type="button"
              onClick={() => applyDatePreset("todo")}
              className="rounded-md bg-slate-100 px-2 py-1 text-slate-700 hover:bg-slate-200"
            >
              Todo
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {/* Fecha Inicio */}
          <div>
            <label className={FILTER_LABEL}>Fecha Desde</label>
            <input
              type="date"
              className={FILTER_INPUT}
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          {/* Fecha Fin */}
          <div>
            <label className={FILTER_LABEL}>Fecha Hasta</label>
            <input
              type="date"
              className={FILTER_INPUT}
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>

          {/* Granularidad */}
          <div>
            <label className={FILTER_LABEL}>Granularidad (Vista)</label>
            <select
              className={FILTER_INPUT}
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as Granularity)}
            >
              {GRANULARITY_OPTIONS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Servicio */}
          <div>
            <label className={FILTER_LABEL}>Servicio</label>
            <select
              className={FILTER_INPUT}
              value={servicioFilter}
              onChange={(e) => setServicioFilter(e.target.value)}
            >
              <option value="todos">Todos los servicios</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.nombre}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Profesional */}
          <div>
            <label className={FILTER_LABEL}>Profesional / Docente</label>
            <select
              className={FILTER_INPUT}
              value={profesionalFilter}
              onChange={(e) => setProfesionalFilter(e.target.value)}
            >
              <option value="todos">Todos los profesionales</option>
              {profesionales.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombreCompleto}
                </option>
              ))}
            </select>
          </div>

          {/* Grupo Etario */}
          <div>
            <label className={FILTER_LABEL}>Grupo Etario</label>
            <select
              className={FILTER_INPUT}
              value={grupoEtarioFilter}
              onChange={(e) => setGrupoEtarioFilter(e.target.value as AgeGroup | "todos")}
            >
              <option value="todos">Todos los grupos</option>
              {AGE_GROUP_CONFIG.map((cfg) => (
                <option key={cfg.id} value={cfg.id}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Procedencia */}
          <div>
            <label className={FILTER_LABEL}>Procedencia</label>
            <select
              className={FILTER_INPUT}
              value={procedenciaFilter}
              onChange={(e) => setProcedenciaFilter(e.target.value as ProcedenciaCategory | "todos")}
            >
              <option value="todos">Todas las localidades</option>
              {PROCEDENCIA_CONFIG.map((cfg) => (
                <option key={cfg.id} value={cfg.id}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Row: Search Practice + Visibility Toggle + Reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-1 items-center gap-2 min-w-[240px] max-w-md">
            <input
              type="text"
              placeholder="Filtrar por nombre de práctica realizada / cobrada..."
              value={practicaQuery}
              onChange={(e) => setPracticaQuery(e.target.value)}
              className={FILTER_INPUT}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Toggle de visibilidad de profesional */}
            <button
              type="button"
              onClick={() => setMostrarProfesional(!mostrarProfesional)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all border ${
                mostrarProfesional
                  ? "bg-sky-50 text-sky-800 border-sky-200"
                  : "bg-slate-100 text-slate-600 border-slate-300"
              }`}
              title="Mostrar u ocultar la columna de profesional para informes consolidados"
            >
              {mostrarProfesional ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {mostrarProfesional
                ? "Desglose por Profesional: ACTIVO"
                : "Consolidado Institucional (Sin Profesional)"}
            </button>

            <button
              type="button"
              onClick={() => void loadAllData()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Cargando..." : "Actualizar"}
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN: FACTURACIÓN Y RENDICIÓN DE CUENTAS */}
      {/* ========================================================================= */}
      {activeTab === "facturacion" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* KPI CARDS (En pantalla: 2 filas de 3 tarjetas) */}
          <div className="no-print grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Total Recaudado */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm border-l-4 border-l-[#003366]">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Total Recaudado
              </p>
              <p className="text-xl font-black tracking-tight text-[#003366] mt-1">
                {formatCurrency(billingKPIs.totalRecaudado)}
              </p>
              <p className="text-3xs font-semibold text-slate-400 mt-0.5">
                {billingKPIs.recibosCount} recibos vigentes emitidos
              </p>
            </div>

            {/* Facturación Promedio por Paciente */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm border-l-4 border-l-sky-600 relative group">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Promedio por Paciente
                </p>
                <span title="Excluye pacientes atendidos en el servicio gratuito 'Atención de Pacientes con Discapacidad'">
                  <Info className="h-3 w-3 text-sky-600" />
                </span>
              </div>
              <p className="text-xl font-black tracking-tight text-sky-800 mt-1">
                {formatCurrency(billingKPIs.promedioFacturacionPorPaciente)}
              </p>
              <p className="text-3xs font-semibold text-slate-500 mt-0.5 leading-tight">
                Excluye discapacidad ({billingKPIs.pacientesAranceladosCount} pac.)
              </p>
            </div>

            {/* Pacientes Únicos Atendidos (Impacto Social) */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm border-l-4 border-l-emerald-600">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Pacientes Únicos
              </p>
              <p className="text-xl font-black tracking-tight text-emerald-800 mt-1">
                {billingKPIs.pacientesUnicosTotal}
              </p>
              <p className="text-3xs font-semibold text-slate-500 mt-0.5">
                {billingKPIs.pacientesDiscapacidadCount > 0
                  ? `Incluye ${billingKPIs.pacientesDiscapacidadCount} pac. gratuitos`
                  : "Beneficiarios directos"}
              </p>
            </div>

            {/* Pacientes Únicos por Día */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm border-l-4 border-l-cyan-600">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Pac. Únicos / Día
              </p>
              <p className="text-xl font-black tracking-tight text-cyan-800 mt-1">
                {billingKPIs.promedioPacientesUnicosDiarios}
              </p>
              <p className="text-3xs font-semibold text-slate-400 mt-0.5">
                Personas facturadas/día ({billingKPIs.diasActivosCount} días activos)
              </p>
            </div>

            {/* Cantidad Promedio de Prácticas por Paciente */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm border-l-4 border-l-violet-600">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Prom. Prácticas / Pac.
              </p>
              <p className="text-xl font-black tracking-tight text-violet-800 mt-1">
                {billingKPIs.promedioPracticasPorPaciente}
              </p>
              <p className="text-3xs font-semibold text-slate-400 mt-0.5">
                Prácticas por paciente único
              </p>
            </div>

            {/* Total Pendiente de Cobro */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm border-l-4 border-l-rose-600">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Total Pendiente
              </p>
              <p className="text-xl font-black tracking-tight text-rose-800 mt-1">
                {formatCurrency(billingKPIs.totalPendiente)}
              </p>
              <p className="text-3xs font-semibold text-slate-400 mt-0.5">
                Saldo activo en tratamientos
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN 2 IMPRESIÓN / PANTALLA: TABLA AGRUPADA DINÁMICA */}
          {/* ========================================================================= */}
          <div
            className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${
              printConfig.table ? "print:block print-page-break" : "print:hidden"
            }`}
          >
            <div className="p-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 no-print">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Rendición Agrupada por [Período ({currentGranularityLabel}) + Servicio +{" "}
                  {mostrarProfesional ? "Docente + " : ""}Práctica]
                </h3>
                <p className="text-3xs text-slate-500 font-semibold mt-0.5">
                  Resumen financiero consolidado según la granularidad seleccionada.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xs font-bold text-slate-500">
                  {billingGroupedRows.length} grupos generados
                </span>
                <label className="flex items-center gap-1.5 text-3xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200">
                  <input
                    type="checkbox"
                    checked={printConfig.table}
                    onChange={() => togglePrintItem("table")}
                    className="rounded border-slate-300 text-[#003366] focus:ring-[#003366]"
                  />
                  <span>🖨️ Imprimir tabla</span>
                </label>
              </div>
            </div>

            {/* Vista en Pantalla (Paginada) */}
            <div className="no-print custom-scrollbar w-full max-h-[calc(100vh-380px)] overflow-auto">
              <table className="report-spreadsheet-table w-full min-w-[900px] table-auto border-collapse text-left text-xs">
                <thead>
                  <tr>
                    <th>Período / Fecha</th>
                    <th>Servicio</th>
                    {mostrarProfesional && <th>Docente / Profesional</th>}
                    <th>Práctica cobrada</th>
                    <th className="text-right">Cant. Prácticas</th>
                    <th className="text-right">Recaudado Total</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBillingRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={mostrarProfesional ? 6 : 5}
                        className="py-8 text-center text-slate-500 font-medium"
                      >
                        {loading ? "Cargando datos..." : "Sin registros con los filtros seleccionados."}
                      </td>
                    </tr>
                  ) : (
                    paginatedBillingRows.map((row) => (
                      <tr key={row.groupKey} className="hover:bg-slate-100/60">
                        <td className="font-semibold text-slate-900">{row.periodLabel}</td>
                        <td className="text-slate-700">{row.servicio}</td>
                        {mostrarProfesional && (
                          <td className="text-slate-700 font-medium">{row.profesionalNombre || "—"}</td>
                        )}
                        <td className="text-slate-800 font-medium">{row.practicaCobrada}</td>
                        <td className="text-right font-mono font-bold text-slate-900">
                          {row.cantidadPracticas}
                        </td>
                        <td className="text-right font-bold text-emerald-800">
                          {formatCurrency(row.recaudadoTotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* FILA DE TOTALES ACUMULADA */}
                {billingGroupedRows.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-slate-200/90 font-bold text-slate-950 border-t-2 border-slate-800 text-xs">
                    <tr>
                      <td
                        colSpan={mostrarProfesional ? 4 : 3}
                        className="px-3 py-2 uppercase tracking-wider text-slate-900"
                      >
                        TOTAL GENERAL ACUMULADO
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-950 text-sm">
                        {billingTotals.totalPracticas}
                      </td>
                      <td className="px-3 py-2 text-right font-black text-emerald-900 text-sm">
                        {formatCurrency(billingTotals.totalRecaudado)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Paginador en Pantalla */}
            <ReportPagination
              currentPage={currentPage}
              totalItems={billingGroupedRows.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />

            {/* Tabla de Impresión (Completa, sin corte) */}
            <div className="hidden print:block w-full">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                2. Tabla de Rendición Agrupada por Período y Servicio
              </h2>
              <table className="report-spreadsheet-table w-full table-auto border-collapse text-left text-2xs">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Servicio</th>
                    {mostrarProfesional && <th>Docente Responsable</th>}
                    <th>Práctica cobrada</th>
                    <th className="text-right">Cantidad</th>
                    <th className="text-right">Recaudado Total</th>
                  </tr>
                </thead>
                <tbody>
                  {billingGroupedRows.map((row) => (
                    <tr key={`print-bill-${row.groupKey}`}>
                      <td className="font-semibold">{row.periodLabel}</td>
                      <td>{row.servicio}</td>
                      {mostrarProfesional && <td>{row.profesionalNombre || "—"}</td>}
                      <td>{row.practicaCobrada}</td>
                      <td className="text-right font-bold">{row.cantidadPracticas}</td>
                      <td className="text-right font-bold text-emerald-800">
                        {formatCurrency(row.recaudadoTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-900 font-bold text-slate-900">
                  <tr>
                    <td colSpan={mostrarProfesional ? 4 : 3} className="uppercase">
                      TOTAL GENERAL ACUMULADO
                    </td>
                    <td className="text-right font-black">{billingTotals.totalPracticas}</td>
                    <td className="text-right font-black text-emerald-900">
                      {formatCurrency(billingTotals.totalRecaudado)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN 3 IMPRESIÓN / PANTALLA: GRÁFICO DE EVOLUCIÓN TEMPORAL */}
          {/* ========================================================================= */}
          <div className={printConfig.timeSeriesChart ? "print:block print-page-break" : "print:hidden"}>
            <div className="flex justify-between items-center mb-1 no-print">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Evolución de Recaudación en el Tiempo
              </h3>
              <label className="flex items-center gap-1.5 text-3xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200">
                <input
                  type="checkbox"
                  checked={printConfig.timeSeriesChart}
                  onChange={() => togglePrintItem("timeSeriesChart")}
                  className="rounded border-slate-300 text-[#003366] focus:ring-[#003366]"
                />
                <span>🖨️ Imprimir este gráfico</span>
              </label>
            </div>
            <div className="hidden print:block mb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                3. Gráfico: Evolución Temporal de Recaudación ({currentGranularityLabel})
              </h2>
            </div>
            <AnalyticsLineBarChart
              data={billingTimeSeries}
              title={`Evolución Temporal de Recaudación (Vista por ${currentGranularityLabel})`}
              subtitle="Ingresos por cobros de aranceles clínicos acumulados en el tiempo"
              isCurrency={true}
              valueLabel="Recaudación"
            />
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN 4 IMPRESIÓN / PANTALLA: RECAUDACIÓN POR SERVICIO */}
          {/* ========================================================================= */}
          <div className={printConfig.serviceChart ? "print:block print-page-break" : "print:hidden"}>
            <div className="flex justify-between items-center mb-1 no-print">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Recaudación por Servicio
              </h3>
              <label className="flex items-center gap-1.5 text-3xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200">
                <input
                  type="checkbox"
                  checked={printConfig.serviceChart}
                  onChange={() => togglePrintItem("serviceChart")}
                  className="rounded border-slate-300 text-[#003366] focus:ring-[#003366]"
                />
                <span>🖨️ Imprimir este gráfico</span>
              </label>
            </div>
            <div className="hidden print:block mb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                4. Gráfico: Recaudación por Servicio
              </h2>
            </div>
            <AnalyticsHorizontalBarChart
              data={billingServiceSeries}
              title="Recaudación por Servicio"
              subtitle="Volumen financiero generado por área clínica del hospital"
              isCurrency={true}
              valueLabel="Recaudación"
            />
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN 5 IMPRESIÓN / PANTALLA: DISTRIBUCIÓN DE PACIENTES (DEMOGRAFÍA) */}
          {/* ========================================================================= */}
          <div className={printConfig.demographicsChart ? "print:block" : "print:hidden"}>
            <div className="flex justify-between items-center mb-1 no-print">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Distribución de Pacientes (Grupo Etario y Procedencia)
              </h3>
              <label className="flex items-center gap-1.5 text-3xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200">
                <input
                  type="checkbox"
                  checked={printConfig.demographicsChart}
                  onChange={() => togglePrintItem("demographicsChart")}
                  className="rounded border-slate-300 text-[#003366] focus:ring-[#003366]"
                />
                <span>🖨️ Imprimir gráficos demográficos</span>
              </label>
            </div>
            <div className="hidden print:block mb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                5. Distribución Sociodemográfica de Pacientes
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <AnalyticsDonutChart
                data={billingAgeGroupSeries}
                title="Distribución de Pacientes por Grupo Etario"
                subtitle="Impacto social según franja de edad de los pacientes atendidos"
                centerLabel="Pacientes"
              />

              <AnalyticsDonutChart
                data={billingProcedenciaSeries}
                title="Distribución de Pacientes por Procedencia"
                subtitle="Zona geográfica y localidades de procedencia de los pacientes"
                centerLabel="Localidad"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN: ATENCIÓN CLÍNICA Y GESTIÓN ASISTENCIAL */}
      {/* ========================================================================= */}
      {activeTab === "clinica" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* KPI CARDS (En pantalla: 2 filas de 3 tarjetas) */}
          <div className="no-print grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Total de Atenciones */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm border-l-4 border-l-[#003366]">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Total Atenciones
              </p>
              <p className="text-xl font-black tracking-tight text-[#003366] mt-1">
                {clinicalKPIs.totalAtenciones}
              </p>
              <p className="text-3xs font-semibold text-slate-400 mt-0.5">
                Prácticas asistenciales registradas
              </p>
            </div>

            {/* Pacientes Únicos (Impacto Social) */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm border-l-4 border-l-emerald-600">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Pacientes Únicos
              </p>
              <p className="text-xl font-black tracking-tight text-emerald-800 mt-1">
                {clinicalKPIs.pacientesUnicos}
              </p>
              <p className="text-3xs font-semibold text-slate-400 mt-0.5">
                Personas beneficiadas
              </p>
            </div>

            {/* Pacientes Únicos por Día */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm border-l-4 border-l-cyan-600">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Pac. Únicos / Día
              </p>
              <p className="text-xl font-black tracking-tight text-cyan-800 mt-1">
                {clinicalKPIs.promedioPacientesUnicosDiarios}
              </p>
              <p className="text-3xs font-semibold text-slate-400 mt-0.5">
                Personas atendidas/día ({clinicalKPIs.diasActivosCount} días activos)
              </p>
            </div>

            {/* Cantidad Promedio de Prácticas por Paciente */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm border-l-4 border-l-violet-600">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Prom. Prácticas / Pac.
              </p>
              <p className="text-xl font-black tracking-tight text-violet-800 mt-1">
                {clinicalKPIs.promedioPracticasPorPaciente}
              </p>
              <p className="text-3xs font-semibold text-slate-400 mt-0.5">
                Por paciente atendido
              </p>
            </div>

            {/* Promedio de Atenciones Diarias */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm border-l-4 border-l-teal-600">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Promedio Diario
              </p>
              <p className="text-xl font-black tracking-tight text-teal-800 mt-1">
                {clinicalKPIs.promedioDiario}
              </p>
              <p className="text-3xs font-semibold text-slate-400 mt-0.5">
                Atenciones totales por día
              </p>
            </div>

            {/* Promedio Asistencial Periódico */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm border-l-4 border-l-indigo-600">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Promedio / {currentGranularityLabel}
              </p>
              <p className="text-xl font-black tracking-tight text-indigo-800 mt-1">
                {clinicalKPIs.promedioPeriodico}
              </p>
              <p className="text-3xs font-semibold text-slate-400 mt-0.5">
                Atenciones por período ({clinicalKPIs.periodosActivos} períodos)
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN 2 IMPRESIÓN / PANTALLA: TABLA AGRUPADA ASISTENCIAL */}
          {/* ========================================================================= */}
          <div
            className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${
              printConfig.table ? "print:block print-page-break" : "print:hidden"
            }`}
          >
            <div className="p-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 no-print">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Gestión Asistencial Agrupada por [Período ({currentGranularityLabel}) + Servicio +{" "}
                  {mostrarProfesional ? "Odontólogo + " : ""}Práctica]
                </h3>
                <p className="text-3xs text-slate-500 font-semibold mt-0.5">
                  Volumen prestacional consolidado en consultorio y servicios.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xs font-bold text-slate-500">
                  {clinicalGroupedRows.length} grupos generados
                </span>
                <label className="flex items-center gap-1.5 text-3xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200">
                  <input
                    type="checkbox"
                    checked={printConfig.table}
                    onChange={() => togglePrintItem("table")}
                    className="rounded border-slate-300 text-[#003366] focus:ring-[#003366]"
                  />
                  <span>🖨️ Imprimir tabla</span>
                </label>
              </div>
            </div>

            {/* Vista en Pantalla (Paginada) */}
            <div className="no-print custom-scrollbar w-full max-h-[calc(100vh-380px)] overflow-auto">
              <table className="report-spreadsheet-table w-full min-w-[800px] table-auto border-collapse text-left text-xs">
                <thead>
                  <tr>
                    <th>Período / Fecha</th>
                    <th>Servicio</th>
                    {mostrarProfesional && <th>Odontólogo / Operador</th>}
                    <th>Práctica realizada</th>
                    <th className="text-right">Total de Atenciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClinicalRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={mostrarProfesional ? 5 : 4}
                        className="py-8 text-center text-slate-500 font-medium"
                      >
                        {loading ? "Cargando datos..." : "Sin atenciones con los filtros seleccionados."}
                      </td>
                    </tr>
                  ) : (
                    paginatedClinicalRows.map((row) => (
                      <tr key={row.groupKey} className="hover:bg-slate-100/60">
                        <td className="font-semibold text-slate-900">{row.periodLabel}</td>
                        <td className="text-slate-700">{row.servicio}</td>
                        {mostrarProfesional && (
                          <td className="text-slate-700 font-medium">{row.odontologo || "—"}</td>
                        )}
                        <td className="text-slate-800 font-medium">{row.practicaRealizada}</td>
                        <td className="text-right font-mono font-bold text-slate-900">
                          {row.totalAtenciones}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* FILA DE TOTALES ACUMULADA */}
                {clinicalGroupedRows.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-slate-200/90 font-bold text-slate-950 border-t-2 border-slate-800 text-xs">
                    <tr>
                      <td
                        colSpan={mostrarProfesional ? 4 : 3}
                        className="px-3 py-2 uppercase tracking-wider text-slate-900"
                      >
                        TOTAL DE PRESTACIONES / ATENCIONES
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-950 text-sm">
                        {clinicalTotals.totalAtenciones}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Paginador */}
            <ReportPagination
              currentPage={currentPage}
              totalItems={clinicalGroupedRows.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />

            {/* Tabla de Impresión */}
            <div className="hidden print:block w-full">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1 mb-2">
                2. Tabla de Gestión Asistencial Agrupada por Período y Servicio
              </h2>
              <table className="report-spreadsheet-table w-full table-auto border-collapse text-left text-2xs">
                <thead>
                  <tr>
                    <th>Período</th>
                    <th>Servicio</th>
                    {mostrarProfesional && <th>Odontólogo / Operador</th>}
                    <th>Práctica realizada</th>
                    <th className="text-right">Total Atenciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clinicalGroupedRows.map((row) => (
                    <tr key={`print-clin-${row.groupKey}`}>
                      <td className="font-semibold">{row.periodLabel}</td>
                      <td>{row.servicio}</td>
                      {mostrarProfesional && <td>{row.odontologo || "—"}</td>}
                      <td>{row.practicaRealizada}</td>
                      <td className="text-right font-bold">{row.totalAtenciones}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-900 font-bold text-slate-900">
                  <tr>
                    <td colSpan={mostrarProfesional ? 4 : 3} className="uppercase">
                      TOTAL ACUMULADO DE ATENCIONES
                    </td>
                    <td className="text-right font-black">{clinicalTotals.totalAtenciones}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN 3 IMPRESIÓN / PANTALLA: GRÁFICO DE EVOLUCIÓN TEMPORAL */}
          {/* ========================================================================= */}
          <div className={printConfig.timeSeriesChart ? "print:block print-page-break" : "print:hidden"}>
            <div className="flex justify-between items-center mb-1 no-print">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Evolución del Volumen Asistencial
              </h3>
              <label className="flex items-center gap-1.5 text-3xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200">
                <input
                  type="checkbox"
                  checked={printConfig.timeSeriesChart}
                  onChange={() => togglePrintItem("timeSeriesChart")}
                  className="rounded border-slate-300 text-[#003366] focus:ring-[#003366]"
                />
                <span>🖨️ Imprimir este gráfico</span>
              </label>
            </div>
            <div className="hidden print:block mb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                3. Gráfico: Evolución Temporal del Volumen Asistencial ({currentGranularityLabel})
              </h2>
            </div>
            <AnalyticsLineBarChart
              data={clinicalTimeSeries}
              title={`Evolución Temporal del Volumen Asistencial (Vista por ${currentGranularityLabel})`}
              subtitle="Cantidad de atenciones clínicas registradas por período"
              isCurrency={false}
              valueLabel="Atenciones"
            />
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN 4 IMPRESIÓN / PANTALLA: ATENCIONES POR SERVICIO */}
          {/* ========================================================================= */}
          <div className={printConfig.serviceChart ? "print:block print-page-break" : "print:hidden"}>
            <div className="flex justify-between items-center mb-1 no-print">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Atenciones por Servicio
              </h3>
              <label className="flex items-center gap-1.5 text-3xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200">
                <input
                  type="checkbox"
                  checked={printConfig.serviceChart}
                  onChange={() => togglePrintItem("serviceChart")}
                  className="rounded border-slate-300 text-[#003366] focus:ring-[#003366]"
                />
                <span>🖨️ Imprimir este gráfico</span>
              </label>
            </div>
            <div className="hidden print:block mb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                4. Gráfico: Atenciones por Servicio
              </h2>
            </div>
            <AnalyticsHorizontalBarChart
              data={clinicalServiceSeries}
              title="Atenciones por Servicio"
              subtitle="Distribución prestacional por área odontológica"
              isCurrency={false}
              valueLabel="Atenciones"
            />
          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN 5 IMPRESIÓN / PANTALLA: DISTRIBUCIÓN DEMOGRÁFICA */}
          {/* ========================================================================= */}
          <div className={printConfig.demographicsChart ? "print:block" : "print:hidden"}>
            <div className="flex justify-between items-center mb-1 no-print">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Distribución Demográfica de Pacientes
              </h3>
              <label className="flex items-center gap-1.5 text-3xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded cursor-pointer hover:bg-slate-200">
                <input
                  type="checkbox"
                  checked={printConfig.demographicsChart}
                  onChange={() => togglePrintItem("demographicsChart")}
                  className="rounded border-slate-300 text-[#003366] focus:ring-[#003366]"
                />
                <span>🖨️ Imprimir gráficos demográficos</span>
              </label>
            </div>
            <div className="hidden print:block mb-2">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                5. Distribución Demográfica de Pacientes Atendidos
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <AnalyticsDonutChart
                data={clinicalAgeGroupSeries}
                title="Distribución Demográfica por Grupo Etario"
                subtitle="Franjas etarias de los pacientes atendidos en consultorio"
                centerLabel="Pacientes"
              />

              <AnalyticsDonutChart
                data={clinicalProcedenciaSeries}
                title="Procedencia Geográfica de los Pacientes"
                subtitle="Origen de los pacientes según localidad o provincia de residencia"
                centerLabel="Localidad"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
