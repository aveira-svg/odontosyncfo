/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { 
  Plus, 
  Camera, 
  AlertTriangle, 
  Printer, 
  Search, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ArrowDownLeft, 
  ArrowUpRight 
} from "lucide-react";
import { 
  getInsumos, 
  getLotesByInsumo, 
  createInsumo, 
  registrarIngresoStock, 
  registrarEgresoStock, 
  getMovimientosStockHistory 
} from "@/lib/stock-service";
import { getProfesionales, buscarPacientes } from "@/lib/supabase-service";
import type { Insumo, LoteInsumo, Paciente, Profesional } from "@/types";
import { ScannerModal } from "@/components/scanner-modal";

export default function StockPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estado de vistas/tabs
  const [activeTab, setActiveTab] = useState<"inventario" | "planificador">("inventario");
  const [expandedInsumoId, setExpandedInsumoId] = useState<string | null>(null);
  const [lotesMap, setLotesMap] = useState<Record<string, LoteInsumo[]>>({});
  const [loadingLotesId, setLoadingLotesId] = useState<string | null>(null);

  // Filtros de búsqueda y ordenamiento
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("TODAS");
  const [sortField, setSortField] = useState<'id' | 'nombre' | 'categoria' | 'stockMinimo' | 'stockActualTotal'>('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'id' | 'nombre' | 'categoria' | 'stockMinimo' | 'stockActualTotal') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<"INGRESO" | "EGRESO" | "NUEVO_INSUMO">("INGRESO");

  // Modals
  const [isNewInsumoOpen, setIsNewInsumoOpen] = useState(false);
  const [activeIngresoInsumo, setActiveIngresoInsumo] = useState<Insumo | null>(null);
  const [activeEgresoInsumo, setActiveEgresoInsumo] = useState<Insumo | null>(null);

  // Form states: Nuevo Insumo
  const [newInsumoId, setNewInsumoId] = useState("");
  const [newInsumoNombre, setNewInsumoNombre] = useState("");
  const [newInsumoCategoria, setNewInsumoCategoria] = useState("General");
  const [newInsumoMin, setNewInsumoMin] = useState(0);

  // Form states: Ingreso Lote
  const [ingresoCantidad, setIngresoCantidad] = useState<number>(1);
  const [ingresoLoteNum, setIngresoLoteNum] = useState("");
  const [ingresoSerieNum, setIngresoSerieNum] = useState("");
  const [ingresoVencimiento, setIngresoVencimiento] = useState("");
  const [submittingIngreso, setSubmittingIngreso] = useState(false);

  // Form states: Egreso Lote
  const [egresoCantidad, setEgresoCantidad] = useState<number>(1);
  const [egresoServicio, setEgresoServicio] = useState("General");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<Paciente[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Paciente | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [submittingEgreso, setSubmittingEgreso] = useState(false);

  // Planificador de stock (Horizonte)
  const [horizonDays, setHorizonDays] = useState<number>(30);
  const [loadingPlanning, setLoadingPlanning] = useState(false);
  const [planningProposals, setPlanningProposals] = useState<any[]>([]);

  // Categorías de la clínica
  const CATEGORIES = [
    "Endodoncia",
    "Cirugía",
    "Implantes",
    "Biomateriales",
    "Odontopediatría",
    "Periodoncia",
    "Ortodoncia",
    "Descartables",
    "General"
  ];

  // Servicios de destino para egreso
  const SERVICIOS_DESTINO = [
    "Guardia",
    "Cirugía",
    "Clínica de Adultos",
    "Clínica de Niños",
    "Ortodoncia",
    "General"
  ];

  // Cargar datos iniciales
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ins, profs] = await Promise.all([
        getInsumos(),
        getProfesionales({ onlyActive: true })
      ]);
      setInsumos(ins);
      setProfesionales(profs);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al cargar los datos de stock.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Cargar lotes al expandir fila
  const toggleExpandInsumo = async (insumoId: string) => {
    if (expandedInsumoId === insumoId) {
      setExpandedInsumoId(null);
      return;
    }

    setExpandedInsumoId(insumoId);
    
    // Solo cargar si no está en cache
    if (!lotesMap[insumoId]) {
      setLoadingLotesId(insumoId);
      try {
        const lotes = await getLotesByInsumo(insumoId);
        setLotesMap(prev => ({ ...prev, [insumoId]: lotes }));
      } catch (err: any) {
        console.error(err);
        setError("Error al cargar los lotes del insumo.");
      } finally {
        setLoadingLotesId(null);
      }
    }
  };

  // Autocomplete de Pacientes
  useEffect(() => {
    const term = patientSearch.trim();
    if (!term || (selectedPatient && selectedPatient.nombreCompleto === term)) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await buscarPacientes(term, { limit: 10 });
        setPatientResults(results);
      } catch (err) {
        console.error("Error al buscar pacientes para egreso:", err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch, selectedPatient]);

  // Manejar el resultado del scanner de cámara
  const handleScannerScan = (code: string) => {
    setIsScannerOpen(false);
    
    if (scannerMode === "NUEVO_INSUMO") {
      setNewInsumoId(code);
      return;
    }

    // Buscar si el insumo existe
    // Intentar buscar por ID exacto
    const matchedInsumo = insumos.find(
      x => x.id.toLowerCase() === code.toLowerCase() || x.nombre.toLowerCase().includes(code.toLowerCase())
    );

    if (!matchedInsumo) {
      alert(`No se encontró ningún insumo en la base de datos que coincida con el código o nombre: "${code}". Crea primero el insumo básico.`);
      return;
    }

    if (scannerMode === "INGRESO") {
      // Abrir modal de Ingreso
      setIngresoCantidad(1);
      setIngresoLoteNum("");
      setIngresoSerieNum("");
      setIngresoVencimiento("");
      setActiveIngresoInsumo(matchedInsumo);
    } else {
      // Abrir modal de Egreso
      setEgresoCantidad(1);
      setPatientSearch("");
      setSelectedPatient(null);
      setSelectedProfessionalId("");
      setEgresoServicio("General");
      setActiveEgresoInsumo(matchedInsumo);
    }
  };

  // Crear nuevo insumo básico
  const handleCreateInsumoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await createInsumo({
        id: newInsumoId.trim() || undefined,
        nombre: newInsumoNombre,
        categoria: newInsumoCategoria,
        stockMinimo: newInsumoMin
      });
      setSuccess("Insumo básico creado correctamente.");
      setIsNewInsumoOpen(false);
      setNewInsumoId("");
      setNewInsumoNombre("");
      setNewInsumoCategoria("General");
      setNewInsumoMin(0);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al crear el insumo.");
    }
  };

  // Guardar Ingreso de stock
  const handleIngresoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIngresoInsumo) return;
    setError(null);
    setSuccess(null);
    setSubmittingIngreso(true);

    const isImplantOrBiomaterial =
      activeIngresoInsumo.categoria.toLowerCase() === "implantes" ||
      activeIngresoInsumo.categoria.toLowerCase() === "biomateriales";

    if (isImplantOrBiomaterial && !ingresoSerieNum.trim()) {
      setError("El número de serie es estrictamente obligatorio para Implantes y Biomateriales.");
      setSubmittingIngreso(false);
      return;
    }

    try {
      await registrarIngresoStock(activeIngresoInsumo.id, {
        cantidad: ingresoCantidad,
        numeroLote: ingresoLoteNum,
        numeroSerie: ingresoSerieNum || undefined,
        fechaVencimiento: ingresoVencimiento
      });
      setSuccess(`Ingreso registrado: ${ingresoCantidad} unidades cargadas al lote ${ingresoLoteNum}.`);
      setActiveIngresoInsumo(null);
      // Limpiar cache del insumo modificado
      const updatedMap = { ...lotesMap };
      delete updatedMap[activeIngresoInsumo.id];
      setLotesMap(updatedMap);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al registrar el ingreso de stock.");
    } finally {
      setSubmittingIngreso(false);
    }
  };

  // Guardar Egreso de stock (FEFO)
  const handleEgresoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEgresoInsumo) return;
    setError(null);
    setSuccess(null);
    setSubmittingEgreso(true);

    const isImplantOrBiomaterial =
      activeEgresoInsumo.categoria.toLowerCase() === "implantes" ||
      activeEgresoInsumo.categoria.toLowerCase() === "biomateriales";

    if (isImplantOrBiomaterial) {
      if (!selectedPatient) {
        setError("El Paciente es obligatorio para insumos de categoría Implantes/Biomateriales.");
        setSubmittingEgreso(false);
        return;
      }
      if (!selectedProfessionalId) {
        setError("El Profesional odontólogo es obligatorio para insumos de categoría Implantes/Biomateriales.");
        setSubmittingEgreso(false);
        return;
      }
    }

    try {
      await registrarEgresoStock(activeEgresoInsumo.id, {
        cantidad: egresoCantidad,
        servicioDestino: egresoServicio,
        pacienteId: selectedPatient?.id,
        profesionalId: selectedProfessionalId || undefined
      });
      setSuccess(`Egreso registrado: ${egresoCantidad} unidades descontadas (Lógica FEFO aplicada).`);
      setActiveEgresoInsumo(null);
      // Limpiar cache del insumo modificado
      const updatedMap = { ...lotesMap };
      delete updatedMap[activeEgresoInsumo.id];
      setLotesMap(updatedMap);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al registrar el egreso de stock.");
    } finally {
      setSubmittingEgreso(false);
    }
  };

  // Semáforo de lote basado en vencimiento
  const getLoteSemaforoInfo = (fechaVencimiento: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(fechaVencimiento + "T00:00:00"); // Forzar parse local sin timezone shifts
    expiry.setHours(0, 0, 0, 0);

    if (expiry <= today) {
      return {
        color: "rojo",
        label: "VENCIDO (Bloqueado)",
        badgeClass: "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse font-extrabold"
      };
    }

    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 60) {
      return {
        color: "amarillo",
        label: `Vence en ${diffDays} días (Uso Prioritario)`,
        badgeClass: "bg-amber-50 text-amber-700 border border-amber-200 font-extrabold animate-shimmer"
      };
    }

    return {
      color: "verde",
      label: `Vencimiento lejano (${fechaVencimiento})`,
      badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold"
    };
  };

  // Filtrar insumos en base a búsqueda y categoría
  const filteredInsumos = useMemo(() => {
    return insumos.filter(ins => {
      const matchesSearch = ins.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            ins.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "TODAS" || ins.categoria === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [insumos, searchTerm, categoryFilter]);

  // Ordenar insumos
  const sortedInsumos = useMemo(() => {
    const sorted = [...filteredInsumos];
    sorted.sort((a, b) => {
      let valA: any = a[sortField] ?? "";
      let valB: any = b[sortField] ?? "";
      
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      
      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredInsumos, sortField, sortDirection]);



  // Planificador: Calcular propuesta de stock
  const calculatePlanningProposal = useCallback(async () => {
    setLoadingPlanning(true);
    try {
      const history = await getMovimientosStockHistory(horizonDays);
      
      const proposals = insumos.map(ins => {
        // Sumar consumos del insumo en el periodo
        const totalConsumed = history
          .filter(m => m.insumoId === ins.id)
          .reduce((sum, curr) => sum + curr.cantidad, 0);

        const avgDaily = Number((totalConsumed / horizonDays).toFixed(2));
        const stockActual = ins.stockActualTotal || 0;
        
        // Fórmula sugerida: (Consumo Diario * Horizonte) - Stock Actual
        const sugerido = Math.max(0, Math.ceil((avgDaily * horizonDays) - stockActual));

        return {
          insumoId: ins.id,
          nombre: ins.nombre,
          categoria: ins.categoria,
          avgDaily,
          stockActualTotal: stockActual,
          sugerido
        };
      });

      setPlanningProposals(proposals);
    } catch (err: any) {
      console.error(err);
      setError("Error al calcular la planificación de stock.");
    } finally {
      setLoadingPlanning(false);
    }
  }, [horizonDays, insumos]);

  // Ejecutar cálculo al cambiar el horizonte o cambiar a la pestaña de planificador
  useEffect(() => {
    if (activeTab === "planificador" && insumos.length > 0) {
      calculatePlanningProposal();
    }
  }, [activeTab, insumos.length, calculatePlanningProposal]);

  const handleProposalQtyChange = (insumoId: string, value: number) => {
    setPlanningProposals(prev => 
      prev.map(p => p.insumoId === insumoId ? { ...p, sugerido: Math.max(0, value) } : p)
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      
      {/* Header de Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3 gap-3 no-print">
        <div>
          <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-800 uppercase flex items-center gap-2">
            📦 Gestión de Stock e Inventario
          </h1>
          <p className="text-[10px] sm:text-3xs text-slate-400 font-bold uppercase tracking-wider leading-none mt-1">
            Control de insumos por semáforo FEFO, biovigilancia y planeación de compras.
          </p>
        </div>
        
        {/* Botones de acción principal */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setScannerMode("INGRESO");
              setIsScannerOpen(true);
            }}
            className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" />
            Escanear Ingreso
          </button>
          
          <button
            type="button"
            onClick={() => {
              setScannerMode("EGRESO");
              setIsScannerOpen(true);
            }}
            className="btn btn-secondary border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-[10px] uppercase flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5 text-amber-700" />
            Escanear Egreso
          </button>

          <button
            type="button"
            onClick={() => setIsNewInsumoOpen(true)}
            className="btn btn-secondary border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-[10px] uppercase flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Insumo
          </button>
        </div>
      </div>

      {/* Alertas globales de error y éxito */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 shadow-sm flex items-center gap-2 animate-fadeIn no-print">
          <span>⚠️</span>
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 shadow-sm flex items-center gap-2 animate-fadeIn no-print">
          <Check className="w-4 h-4 shrink-0" />
          <p className="font-semibold">{success}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 no-print">
        <button
          type="button"
          onClick={() => setActiveTab("inventario")}
          className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "inventario"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          🗂️ Inventario General
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("planificador")}
          className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "planificador"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          🤖 Planificador de Compras
        </button>
      </div>

      {/* VISTA 1: INVENTARIO GENERAL */}
      {activeTab === "inventario" && (
        <div className="space-y-4 animate-fadeIn no-print">
          
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-3.5 flex items-center text-slate-400 pointer-events-none">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                className="input"
                style={{ paddingLeft: "2.25rem" }}
                placeholder="Buscar por código o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider whitespace-nowrap">
                Filtrar Categoría:
              </label>
              <select
                className="input py-2 text-3xs font-bold uppercase tracking-wider"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="TODAS">TODAS</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Listado de Insumos en Tabla Simple Ordenable */}
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400 font-semibold">
              Cargando catálogo de inventario...
            </div>
          ) : sortedInsumos.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 font-semibold bg-white border border-slate-200 rounded-xl">
              No se encontraron insumos. Prueba con otros criterios de búsqueda o registra uno nuevo.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="report-spreadsheet-table">
                  <thead>
                    <tr className="select-none">
                      <th onClick={() => handleSort("id")} className="cursor-pointer hover:bg-slate-200">
                        Código / Barcode {sortField === "id" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th onClick={() => handleSort("nombre")} className="cursor-pointer hover:bg-slate-200">
                        Nombre Insumo {sortField === "nombre" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th onClick={() => handleSort("categoria")} className="cursor-pointer hover:bg-slate-200">
                        Categoría {sortField === "categoria" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th onClick={() => handleSort("stockMinimo")} className="cursor-pointer hover:bg-slate-200 text-center">
                        Stock Mín. {sortField === "stockMinimo" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th onClick={() => handleSort("stockActualTotal")} className="cursor-pointer hover:bg-slate-200 text-center">
                        Stock Total {sortField === "stockActualTotal" && (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                      <th className="text-center">Lotes y Alertas</th>
                      <th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedInsumos.map(insumo => {
                      const isLowStock = (insumo.stockActualTotal || 0) <= insumo.stockMinimo;
                      const isExpanded = expandedInsumoId === insumo.id;
                      
                      return (
                        <React.Fragment key={insumo.id}>
                          <tr className="hover:bg-slate-50/50 transition-colors">
                            <td className="font-mono text-[10px] font-semibold text-slate-500">{insumo.id}</td>
                            <td className="font-extrabold text-slate-800">{insumo.nombre}</td>
                            <td>
                              <span className="inline-flex text-[9px] font-black uppercase bg-slate-100 border border-slate-200/50 text-slate-600 rounded px-1.5 py-0.5">
                                {insumo.categoria}
                              </span>
                            </td>
                            <td className="text-center font-bold text-slate-500">{insumo.stockMinimo}</td>
                            <td className="text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className={`font-black ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {insumo.stockActualTotal || 0}
                                </span>
                                {isLowStock && (
                                  <span className="inline-flex rounded-full bg-amber-100 p-0.5" title="Bajo stock mínimo">
                                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                onClick={() => toggleExpandInsumo(insumo.id)}
                                className="btn bg-slate-100 hover:bg-slate-200 text-slate-700 py-1 px-2.5 text-[10px] font-extrabold uppercase flex items-center gap-1 mx-auto"
                              >
                                {isExpanded ? "Ocultar" : "Ver Lotes"}
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                            <td className="text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIngresoCantidad(1);
                                    setIngresoLoteNum("");
                                    setIngresoSerieNum("");
                                    setIngresoVencimiento("");
                                    setActiveIngresoInsumo(insumo);
                                  }}
                                  className="btn bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 py-1 px-2 text-[10px] font-extrabold uppercase"
                                >
                                  Ingreso
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEgresoCantidad(1);
                                    setPatientSearch("");
                                    setSelectedPatient(null);
                                    setSelectedProfessionalId("");
                                    setEgresoServicio("General");
                                    setActiveEgresoInsumo(insumo);
                                  }}
                                  className="btn bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 py-1 px-2 text-[10px] font-extrabold uppercase"
                                >
                                  Egreso
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Sub-fila expandida para los lotes */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="bg-slate-50/50 p-4 border-b border-slate-200">
                                <div className="max-w-2xl mx-auto space-y-2">
                                  <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                    📋 Detalle de Lotes para: {insumo.nombre}
                                  </h5>
                                  
                                  {loadingLotesId === insumo.id ? (
                                    <p className="text-xs text-slate-400 font-semibold p-2">Cargando lotes...</p>
                                  ) : !lotesMap[insumo.id] || lotesMap[insumo.id].length === 0 ? (
                                    <p className="text-xs text-slate-400 font-semibold p-2 bg-white border border-slate-200 rounded-lg">
                                      Sin lotes activos en inventario. Carga un ingreso de stock.
                                    </p>
                                  ) : (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {lotesMap[insumo.id].map(lote => {
                                        const semaforo = getLoteSemaforoInfo(lote.fechaVencimiento);
                                        
                                        return (
                                          <div 
                                            key={lote.id}
                                            className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center justify-between gap-3"
                                          >
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-800">
                                                  Lote: {lote.numeroLote}
                                                </span>
                                                {lote.numeroSerie && (
                                                  <span className="text-[8px] bg-slate-100 px-1 py-0.5 rounded text-slate-500 font-mono">
                                                    S/N: {lote.numeroSerie}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="mt-1">
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${semaforo.badgeClass}`}>
                                                  {semaforo.label}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="text-right">
                                              <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide block">
                                                Stock Lote
                                              </span>
                                              <span className="text-xs font-black text-slate-700">
                                                {lote.stockActual}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* VISTA 2: PLANIFICADOR DE PEDIDOS */}
      {activeTab === "planificador" && (
        <div className="space-y-4 animate-fadeIn">
          
          {/* Controles del Planificador */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200 rounded-xl p-4 shadow-sm gap-3 no-print">
            <div className="flex items-center gap-3">
              <label className="text-xs font-extrabold uppercase text-slate-600 tracking-wider">
                ⏳ Horizonte Temporal:
              </label>
              <select
                className="input py-2 text-xs font-bold w-48 border-slate-300"
                value={horizonDays}
                onChange={(e) => setHorizonDays(Number(e.target.value))}
              >
                <option value={15}>15 Días</option>
                <option value={30}>30 Días</option>
                <option value={60}>60 Días</option>
                <option value={90}>90 Días (3 Meses)</option>
                <option value={180}>180 Días (6 Meses)</option>
                <option value={270}>270 Días (9 Meses)</option>
                <option value={365}>365 Días (12 Meses)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={calculatePlanningProposal}
                className="btn btn-secondary py-2 px-4 text-xs font-extrabold uppercase"
              >
                Re-calcular
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary py-2 px-4 text-xs font-extrabold uppercase bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Imprimir Reporte
              </button>
            </div>
          </div>

          {/* Tabla de Propuestas */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-4 print:p-0 print:border-none print:shadow-none">
            
            {/* Header del Reporte al Imprimir */}
            <div className="hidden print:block text-center mb-6">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest leading-none mb-1">
                🏥 Hospital Odontológico
              </h2>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Planificación y Sugerido de Compras Automatizado
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-2">
                Horizonte proyectado: {horizonDays} días | Fecha de generación: {new Date().toLocaleDateString("es-AR")}
              </p>
            </div>

            {loadingPlanning ? (
              <div className="p-10 text-center text-xs text-slate-400 font-semibold">
                Procesando consumos históricos y proyectando stock...
              </div>
            ) : planningProposals.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 font-semibold">
                No hay consumos registrados en este horizonte para proyectar.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="report-spreadsheet-table print:report-spreadsheet-table">
                  <thead>
                    <tr>
                      <th>Insumo</th>
                      <th>Categoría</th>
                      <th className="text-center">Consumo Diario Prom.</th>
                      <th className="text-center">Stock Actual Total</th>
                      <th className="text-center">Consumo Proyectado</th>
                      <th className="text-center print:table-cell">Sugerido Compra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planningProposals.map(proposal => {
                      const projectedUse = Math.ceil(proposal.avgDaily * horizonDays);
                      
                      return (
                        <tr key={proposal.insumoId}>
                          <td className="font-extrabold text-slate-800">{proposal.nombre}</td>
                          <td className="text-slate-500 uppercase font-semibold text-3xs">{proposal.categoria}</td>
                          <td className="text-center font-mono font-bold text-slate-600">{proposal.avgDaily} u/día</td>
                          <td className="text-center font-bold text-slate-700">{proposal.stockActualTotal}</td>
                          <td className="text-center font-bold text-indigo-700">{projectedUse}</td>
                          <td className="text-center print:font-extrabold print:text-xs">
                            <input
                              type="number"
                              className="w-20 text-center rounded border border-slate-300 py-1 text-xs font-bold focus:border-indigo-600 no-print"
                              value={proposal.sugerido}
                              onChange={(e) => handleProposalQtyChange(proposal.insumoId, Number(e.target.value))}
                            />
                            <span className="hidden print:inline font-mono font-black">{proposal.sugerido}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODAL: REGISTRAR NUEVO INSUMO BÁSICO */}
      {isNewInsumoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setIsNewInsumoOpen(false)} />
          <form 
            onSubmit={handleCreateInsumoSubmit}
            className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-300 z-10"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                📦 Crear Insumo Básico
              </h3>
              <button 
                type="button" 
                onClick={() => setIsNewInsumoOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-all"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Código de Barras / ID (Opcional):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input font-mono flex-1"
                    placeholder="Ej: 7791234567890 (Dejar vacío para autogenerar)"
                    value={newInsumoId}
                    onChange={(e) => setNewInsumoId(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setScannerMode("NUEVO_INSUMO");
                      setIsScannerOpen(true);
                    }}
                    className="btn bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-2.5 text-xs font-extrabold uppercase flex items-center justify-center shrink-0"
                    title="Escanear Código de Barras con Cámara"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Nombre del Insumo:
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ej: Anestesia Tubo Plástico"
                  value={newInsumoNombre}
                  onChange={(e) => setNewInsumoNombre(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Categoría del Insumo:
                </label>
                <select
                  className="input font-semibold"
                  value={newInsumoCategoria}
                  onChange={(e) => setNewInsumoCategoria(e.target.value)}
                  required
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Stock Mínimo (Alarma):
                </label>
                <input
                  type="number"
                  className="input"
                  min={0}
                  value={newInsumoMin}
                  onChange={(e) => setNewInsumoMin(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsNewInsumoOpen(false)}
                className="btn btn-secondary px-4 py-2 text-xs font-extrabold uppercase"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold uppercase"
              >
                Crear Insumo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: REGISTRAR DETALLES DE INGRESO (POST ESCANEO) */}
      {activeIngresoInsumo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setActiveIngresoInsumo(null)} />
          <form 
            onSubmit={handleIngresoSubmit}
            className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-300 z-10"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                Registrar Ingreso de Stock
              </h3>
              <button 
                type="button" 
                onClick={() => setActiveIngresoInsumo(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Insumo info */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block leading-none">
                Insumo Escaneado
              </span>
              <span className="text-xs font-extrabold text-slate-800 mt-1 block">
                {activeIngresoInsumo.nombre}
              </span>
              <span className="inline-flex text-[9px] font-black uppercase bg-indigo-50 border border-indigo-100 text-indigo-700 rounded px-1.5 py-0.5 mt-1.5">
                {activeIngresoInsumo.categoria}
              </span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Cantidad a Ingresar:
                  </label>
                  <input
                    type="number"
                    className="input font-bold"
                    min={1}
                    value={ingresoCantidad}
                    onChange={(e) => setIngresoCantidad(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Número de Lote:
                  </label>
                  <input
                    type="text"
                    className="input font-mono font-bold"
                    placeholder="Ej: L1203"
                    value={ingresoLoteNum}
                    onChange={(e) => setIngresoLoteNum(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Número de Serie (Mandatorio condicional) */}
              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center justify-between">
                  <span>Número de Serie:</span>
                  {(activeIngresoInsumo.categoria.toLowerCase() === "implantes" || 
                    activeIngresoInsumo.categoria.toLowerCase() === "biomateriales") && (
                    <span className="text-[8px] bg-rose-50 text-rose-700 border border-rose-100 rounded px-1 py-0.5 font-black uppercase">
                      Obligatorio
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className="input font-mono"
                  placeholder="Ej: SN9421"
                  value={ingresoSerieNum}
                  onChange={(e) => setIngresoSerieNum(e.target.value)}
                  required={
                    activeIngresoInsumo.categoria.toLowerCase() === "implantes" || 
                    activeIngresoInsumo.categoria.toLowerCase() === "biomateriales"
                  }
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Fecha de Vencimiento:
                </label>
                <input
                  type="date"
                  className="input font-semibold"
                  value={ingresoVencimiento}
                  onChange={(e) => setIngresoVencimiento(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setActiveIngresoInsumo(null)}
                className="btn btn-secondary px-4 py-2 text-xs font-extrabold uppercase"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingIngreso}
                className="btn btn-primary px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold uppercase disabled:opacity-50"
              >
                {submittingIngreso ? "Registrando..." : "Guardar Ingreso"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: REGISTRAR EGRESO (POST ESCANEO) */}
      {activeEgresoInsumo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setActiveEgresoInsumo(null)} />
          <form 
            onSubmit={handleEgresoSubmit}
            className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-300 z-10"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <ArrowUpRight className="w-5 h-5 text-amber-600" />
                Registrar Consumo / Egreso
              </h3>
              <button 
                type="button" 
                onClick={() => setActiveEgresoInsumo(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Insumo info */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block leading-none">
                  Insumo Escaneado
                </span>
                <span className="text-xs font-extrabold text-slate-800 mt-1 block">
                  {activeEgresoInsumo.nombre}
                </span>
                <span className="inline-flex text-[9px] font-black uppercase bg-indigo-50 border border-indigo-100 text-indigo-700 rounded px-1.5 py-0.5 mt-1.5">
                  {activeEgresoInsumo.categoria}
                </span>
              </div>
              
              <div className="text-right">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">
                  Disp. Total
                </span>
                <span className="text-sm font-black text-slate-700">
                  {activeEgresoInsumo.stockActualTotal || 0}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Cantidad a Egresar:
                  </label>
                  <input
                    type="number"
                    className="input font-bold"
                    min={1}
                    max={activeEgresoInsumo.stockActualTotal || 1}
                    value={egresoCantidad}
                    onChange={(e) => setEgresoCantidad(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                    Servicio Destino:
                  </label>
                  <select
                    className="input font-bold"
                    value={egresoServicio}
                    onChange={(e) => setEgresoServicio(e.target.value)}
                    required
                  >
                    {SERVICIOS_DESTINO.map(srv => (
                      <option key={srv} value={srv}>{srv}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lógica condicional de trazabilidad: Implantes y Biomateriales */}
              {(activeEgresoInsumo.categoria.toLowerCase() === "implantes" ||
                activeEgresoInsumo.categoria.toLowerCase() === "biomateriales") && (
                <div className="bg-rose-50/50 border border-rose-100/80 p-3 rounded-xl space-y-3">
                  <h4 className="text-[9px] font-black text-rose-700 uppercase tracking-widest flex items-center gap-1">
                    🚨 Biovigilancia Requerida
                  </h4>
                  
                  {/* Autocomplete de Pacientes */}
                  <div className="space-y-1 relative">
                    <label className="block text-[8px] font-black uppercase text-slate-500 tracking-wider">
                      Paciente (Autocomplete predictivo):
                    </label>
                    <input
                      type="text"
                      className="input py-2 text-xs"
                      placeholder="DNI o Nombre completo del paciente"
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setSelectedPatient(null);
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      required
                    />
                    
                    {showPatientDropdown && patientResults.length > 0 && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowPatientDropdown(false)} />
                        <div className="absolute left-0 right-0 mt-1 max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg z-40">
                          {patientResults.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedPatient(p);
                                setPatientSearch(p.nombreCompleto);
                                setShowPatientDropdown(false);
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-slate-100 font-semibold text-slate-700"
                            >
                              {p.nombreCompleto} (DNI: {p.id})
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Dropdown Profesionales */}
                  <div className="space-y-1">
                    <label className="block text-[8px] font-black uppercase text-slate-500 tracking-wider">
                      Odontólogo Responsable:
                    </label>
                    <select
                      className="input py-2 text-xs font-semibold"
                      value={selectedProfessionalId}
                      onChange={(e) => setSelectedProfessionalId(e.target.value)}
                      required
                    >
                      <option value="">Selecciona Odontólogo...</option>
                      {profesionales.map(prof => (
                        <option key={prof.id} value={prof.id}>
                          {prof.nombreCompleto}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setActiveEgresoInsumo(null)}
                className="btn btn-secondary px-4 py-2 text-xs font-extrabold uppercase"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingEgreso}
                className="btn btn-primary px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold uppercase disabled:opacity-50"
              >
                {submittingEgreso ? "Procesando..." : "Confirmar Egreso FEFO"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SCANNER MODAL DE CAMARA */}
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScannerScan}
        title={scannerMode === "INGRESO" ? "Escanear Ingreso Stock" : "Escanear Egreso Stock"}
      />

    </div>
  );
}
