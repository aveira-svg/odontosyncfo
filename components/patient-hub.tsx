"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import {
  buscarPacientes,
  createFacturacion,
  createPaciente,
  createPracticaClinica,
  deleteFacturacion,
  deletePaciente,
  updatePaciente,
  deletePracticaClinica,
  getAranceles,
  getCatalogoPracticasClinicas,
  getFacturacionByPaciente,
  getPagosByPaciente,
  getPracticasClinicasByPaciente,
  getProfesionales,
  getServicios,
  registrarPagoRecibido,
  getPacienteById,
  getPasantes
} from "@/lib/supabase-service";
import { esFacturacionVigente } from "@/lib/facturacion-utils";
import type {
  Arancel,
  Paciente,
  Profesional,
  Servicio,
  Facturacion,
  PagoRecibido,
  PracticaClinica,
  AppTimestamp,
  Pasante
} from "@/types";
import { formatDateEsAr } from "@/lib/date-utils";

type CatalogoPractica = { id: string; nombre: string };

function cleanText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
      }
    }
  }
  return matrix[a.length][b.length];
}

function matchWordFuzzy(queryWord: string, targetWord: string): boolean {
  if (targetWord.includes(queryWord)) return true;
  if (queryWord.length <= 3) {
    return targetWord.startsWith(queryWord);
  }
  const maxDistance = queryWord.length >= 6 ? 2 : 1;
  const len = queryWord.length;
  for (let i = 0; i <= targetWord.length - len; i++) {
    const window = targetWord.substring(i, i + len);
    if (levenshtein(queryWord, window) <= maxDistance) {
      return true;
    }
  }
  return false;
}

function fechaNacimientoToInputValue(fecha: string | AppTimestamp | undefined): string {
  if (!fecha) return "";
  if (typeof fecha === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const date = fecha.toDate();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSmartMatch(queryStr: string, patientName: string, patientId: string): boolean {
  const qClean = cleanText(queryStr);
  const nameClean = cleanText(patientName);
  const idClean = cleanText(patientId);
  if (!qClean) return true;
  if (nameClean.includes(qClean) || idClean.includes(qClean)) {
    return true;
  }
  const queryWords = qClean.split(/\s+/).filter(Boolean);
  const patientWords = nameClean.split(/\s+/).filter(Boolean);
  return queryWords.every((qW) => {
    if (idClean.startsWith(qW)) return true;
    return patientWords.some((pW) => matchWordFuzzy(qW, pW));
  });
}


export function PatientHub() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [profesionalesActivos, setProfesionalesActivos] = useState<Profesional[]>([]);
  const [pasantesActivos, setPasantesActivos] = useState<Pasante[]>([]);
  const [arancelesActivos, setArancelesActivos] = useState<Arancel[]>([]);
  const [practicas, setPracticas] = useState<CatalogoPractica[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPacienteId, setSelectedPacienteId] = useState("");
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [activeForm, setActiveForm] = useState<"clinica" | "caja" | "historial">("clinica");
  const [isEditingPaciente, setIsEditingPaciente] = useState(false);
  const [selectedPracticas, setSelectedPracticas] = useState<string[]>([]);
  const [currentPractica, setCurrentPractica] = useState("");
  const [historialPracticas, setHistorialPracticas] = useState<PracticaClinica[]>([]);
  const [historialInvoices, setHistorialInvoices] = useState<Facturacion[]>([]);
  const [historialPagos, setHistorialPagos] = useState<PagoRecibido[]>([]);
  const [viewingPagosFacturaId, setViewingPagosFacturaId] = useState<string | null>(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [message, setMessage] = useState("");
  const [dbError, setDbError] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    id: string;
    type: "practica" | "facturacion" | "paciente";
    title: string;
    details: string;
  } | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Facturacion | null>(null);
  const [isRegisteringPaciente, setIsRegisteringPaciente] = useState(false);

  const patientInitial = useMemo(() => {
    if (!selectedPaciente?.nombreCompleto) return "?";
    return selectedPaciente.nombreCompleto.trim().charAt(0).toUpperCase();
  }, [selectedPaciente?.nombreCompleto]);

  async function handleDeleteConfirm() {
    if (!deleteConfirmation) return;
    try {
      if (deleteConfirmation.type === "practica") {
        await deletePracticaClinica(deleteConfirmation.id);
        setMessage("Registro eliminado correctamente.");
        if (selectedPacienteId) await loadHistorial(selectedPacienteId);
      } else if (deleteConfirmation.type === "facturacion") {
        await deleteFacturacion(deleteConfirmation.id);
        setMessage("Registro eliminado correctamente.");
        if (selectedPacienteId) await loadHistorial(selectedPacienteId);
      } else if (deleteConfirmation.type === "paciente") {
        await deletePaciente(deleteConfirmation.id);
        setMessage("Paciente eliminado correctamente.");
        setSelectedPacienteId("");
        setSearch("");
        await loadData();
      }
      setDeleteConfirmation(null);
    } catch (err) {
      console.error("Error al eliminar:", err);
      setMessage("Error al intentar realizar la eliminación.");
    }
  }

  async function onSubmitPagoSaldo(formData: FormData) {
    if (!payingInvoice?.id || !selectedPaciente) return;
    const numeroRecibo = String(formData.get("recibo"));
    const fecha = String(formData.get("fecha"));
    const montoAbonado = Number(formData.get("montoAbonado"));

    if (!numeroRecibo || !fecha || isNaN(montoAbonado) || montoAbonado <= 0) {
      alert("Por favor completa todos los campos correctamente.");
      return;
    }

    if (montoAbonado > payingInvoice.saldoPendiente) {
      alert(`El monto abonado no puede superar el saldo pendiente de $${payingInvoice.saldoPendiente}.`);
      return;
    }

    try {
      await registrarPagoRecibido(payingInvoice.id, {
        numeroRecibo,
        fecha,
        monto: montoAbonado,
        pacienteId: selectedPaciente.id,
        observaciones: String(
          formData.get("detalleAdicional") ??
            `Abono a cargo Recibo #${payingInvoice.id}`
        )
      });

      setMessage("Abono registrado correctamente. El saldo de esta práctica fue actualizado.");
      setPayingInvoice(null);
      await loadHistorial(selectedPaciente.id);
    } catch (err) {
      console.error("Error al registrar pago de saldo:", err);
      setMessage((err as Error).message || "Error al intentar registrar el abono.");
    }
  }

  async function loadData() {
    setDbError("");
    try {
      const [s, pr, a, pc, p, pas] = await Promise.all([
        getServicios(),
        getProfesionales({ onlyActive: true }),
        getAranceles({ onlyActive: true }),
        getCatalogoPracticasClinicas({ onlyActive: true }),
        buscarPacientes("", { limit: 50 }),
        getPasantes({ onlyActive: true })
      ]);
      setServicios(s);
      setProfesionalesActivos(pr);
      setArancelesActivos(a);
      setPracticas(pc);
      setPacientes(p);
      setPasantesActivos(pas);
    } catch (e) {
      console.error("Error al inicializar base de datos:", e);
      setDbError((e as Error).message || "No se pudo conectar con Supabase.");
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  // Búsqueda de pacientes en servidor (debounce)
  useEffect(() => {
    const term = search.trim();
    const timer = setTimeout(async () => {
      try {
        const results = await buscarPacientes(term, { limit: 50 });
        setPacientes(results);
      } catch (e) {
        console.error("Error al buscar pacientes:", e);
      }
    }, term ? 280 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  // Autoseleccionar si hay coincidencia exacta de DNI
  useEffect(() => {
    const term = search.trim();
    if (term) {
      const match = pacientes.find((x) => String(x.id).toLowerCase() === term.toLowerCase());
      if (match && match.id !== selectedPacienteId) {
        setSelectedPacienteId(match.id);
        setIsDropdownOpen(false);
      }
    }
  }, [search, pacientes, selectedPacienteId]);

  const filteredPacientes = pacientes;

  const fetchSelectedPaciente = useCallback(async (id: string) => {
    if (!id) {
      setSelectedPaciente(null);
      return;
    }
    try {
      const p = await getPacienteById(id);
      setSelectedPaciente(p);
    } catch (e) {
      console.error("Error fetching selected patient:", e);
    }
  }, []);

  useEffect(() => {
    if (selectedPacienteId) {
      void fetchSelectedPaciente(selectedPacienteId);
    } else {
      setSelectedPaciente(null);
    }
  }, [selectedPacienteId, fetchSelectedPaciente]);

  // Calcular edad
  const edad = useMemo(() => {
    if (!selectedPaciente || !selectedPaciente.fechaNacimiento) return null;
    let birthDate: Date;
    if (typeof selectedPaciente.fechaNacimiento === "string") {
      birthDate = new Date(selectedPaciente.fechaNacimiento);
    } else {
      // Si viene como Timestamp
      birthDate = (selectedPaciente.fechaNacimiento as unknown as { toDate: () => Date }).toDate();
    }
    
    if (isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }, [selectedPaciente]);

  async function loadHistorial(pacienteId: string) {
    setLoadingHistorial(true);
    try {
      const [userPracticas, allInvoices, userPagos] = await Promise.all([
        getPracticasClinicasByPaciente(pacienteId),
        getFacturacionByPaciente(pacienteId),
        getPagosByPaciente(pacienteId)
      ]);
      const userInvoices = allInvoices.filter((x) => esFacturacionVigente(x));
      const idsVigentes = new Set(userInvoices.map((x) => x.id).filter(Boolean));
      const pagosFiltrados = userPagos.filter((x) => idsVigentes.has(x.facturacionId));
      setHistorialPracticas(userPracticas);
      setHistorialInvoices(userInvoices);
      setHistorialPagos(pagosFiltrados);
    } catch (err) {
      console.error("Error al cargar historial:", err);
    } finally {
      setLoadingHistorial(false);
    }
  }

  const deudasPendientes = useMemo(
    () =>
      historialInvoices.filter(
        (inv) =>
          esFacturacionVigente(inv) &&
          inv.saldoPendiente > 0 &&
          inv.estado !== "PAGADA"
      ),
    [historialInvoices]
  );

  const pagosPorFactura = useMemo(() => {
    const map: Record<string, PagoRecibido[]> = {};
    historialPagos.forEach((p) => {
      if (!map[p.facturacionId]) map[p.facturacionId] = [];
      map[p.facturacionId].push(p);
    });
    return map;
  }, [historialPagos]);

  const pagosFacturaSeleccionada = useMemo(() => {
    if (!viewingPagosFacturaId) return [];
    return pagosPorFactura[viewingPagosFacturaId] ?? [];
  }, [viewingPagosFacturaId, pagosPorFactura]);

  function formatFecha(val: string | AppTimestamp | undefined) {
    if (!val) return "-";
    if (typeof val === "string") return val;
    return formatDateEsAr(val);
  }

  function formatMoney(val: number) {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(val);
  }

  useEffect(() => {
    if (activeForm === "historial" && selectedPacienteId) {
      void loadHistorial(selectedPacienteId);
    }
  }, [activeForm, selectedPacienteId]);

  async function onCreatePaciente(formData: FormData) {
    const id = String(formData.get("id") ?? "");
    const nombreCompleto = String(formData.get("nombreCompleto") ?? "");
    if (!id || !nombreCompleto) return;
    try {
      await createPaciente({
        id,
        nombreCompleto,
        telefono: String(formData.get("telefono") ?? ""),
        fechaNacimiento: String(formData.get("fechaNacimiento") ?? ""),
        direccion: String(formData.get("direccion") ?? "")
      });
      setMessage("Paciente creado correctamente.");
      await loadData();
      setSelectedPacienteId(id);
      setSearch("");
      setIsRegisteringPaciente(false);
    } catch (err) {
      console.error("Error al registrar paciente:", err);
      setMessage((err as Error).message || "Error al intentar crear el paciente.");
    }
  }

  async function onUpdatePaciente(formData: FormData) {
    if (!selectedPaciente) return;
    const nombreCompleto = String(formData.get("nombreCompleto") ?? "");
    if (!nombreCompleto) return;
    try {
      await updatePaciente(selectedPaciente.id, {
        nombreCompleto,
        telefono: String(formData.get("telefono") ?? ""),
        fechaNacimiento: String(formData.get("fechaNacimiento") ?? ""),
        direccion: String(formData.get("direccion") ?? "")
      });
      setMessage("Información del paciente actualizada correctamente.");
      setIsEditingPaciente(false);
      await loadData();
      if (selectedPacienteId) {
        void fetchSelectedPaciente(selectedPacienteId);
      }
    } catch (err) {
      console.error("Error al actualizar paciente:", err);
      setMessage((err as Error).message || "Error al intentar actualizar el paciente.");
    }
  }

  function handleAddPractica() {
    if (currentPractica && !selectedPracticas.includes(currentPractica)) {
      setSelectedPracticas([...selectedPracticas, currentPractica]);
      setCurrentPractica("");
    }
  }

  async function onSubmitClinica(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPaciente) return;
    if (selectedPracticas.length === 0) {
      alert("Debes agregar al menos una práctica.");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const pasanteVal = String(formData.get("pasante") ?? "");
    try {
      await Promise.all(
        selectedPracticas.map((practica) =>
          createPracticaClinica({
            pacienteId: selectedPaciente.id,
            pacienteNombre: selectedPaciente.nombreCompleto,
            fechaAtencion: String(formData.get("fechaAtencion")),
            servicio: String(formData.get("servicio")),
            practicaRealizada: practica,
            odontologoResponsable: String(formData.get("odontologoResponsable")),
            pasante: pasanteVal || undefined
          })
        )
      );
      setMessage("Atenciones clínicas registradas correctamente.");
      setSelectedPracticas([]);
      setActiveForm("historial");
      await loadData();
      if (selectedPacienteId) {
        await loadHistorial(selectedPacienteId);
      }
    } catch (err) {
      console.error(err);
      setMessage("Error al registrar las atenciones clínicas.");
    }
  }

  async function onSubmitCaja(formData: FormData) {
    if (!selectedPaciente) return;
    const practicaCobradaId = String(formData.get("practicaCobradaId") ?? "");
    const practicaCobradaDetalle = String(formData.get("practicaCobradaDetalle") ?? "");
    const costoTotal = Number(formData.get("costoTotal") ?? 0);
    const montoAbonado = Number(formData.get("montoAbonado") ?? 0);
    const profesionalId = String(formData.get("profesionalId") ?? "");

    if (!practicaCobradaId || !practicaCobradaDetalle || !profesionalId) {
      alert("Por favor selecciona al menos una práctica y un odontólogo responsable.");
      return;
    }

    try {
      await createFacturacion(String(formData.get("recibo")), {
        fecha: String(formData.get("fecha")),
        pacienteId: selectedPaciente.id,
        pacienteNombre: selectedPaciente.nombreCompleto,
        practicaCobradaId,
        practicaCobradaDetalle,
        servicioAsociado: String(formData.get("servicioAsociado")),
        costoTotal,
        montoAbonado,
        detalleAdicional: String(formData.get("detalleAdicional") ?? ""),
        profesionalId
      });
      setMessage("Registro de caja guardado.");
      setActiveForm("historial");
    } catch (err) {
      console.error("Error al registrar factura:", err);
      setMessage((err as Error).message || "Error al intentar registrar la factura.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {dbError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 shadow-sm">
          <p className="font-semibold">Base de datos no conectada</p>
          <p className="mt-1 text-xs leading-relaxed">
            Configurá las credenciales de Supabase en{" "}
            <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs">.env.local</code>.
          </p>
          <p className="mt-2 font-mono text-xs text-amber-800">{dbError}</p>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">Buscador Central de Pacientes</h2>
          <div className="flex flex-wrap items-center gap-2">
            {selectedPaciente && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPacienteId("");
                  setSearch("");
                }}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Deseleccionar
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsRegisteringPaciente(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              Registrar nuevo paciente
            </button>
          </div>
        </div>

        <div className="relative max-w-3xl">
          <div className="relative flex items-center">
            <input
              className="input pr-10"
              placeholder="Escribe el DNI o nombre del paciente..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-all p-0.5 rounded-full hover:bg-slate-100"
              >
                ✕
              </button>
            )}
          </div>

          {/* Panel flotante de resultados de búsqueda */}
          {isDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-100 bg-white/95 backdrop-blur-md p-2 shadow-lg ring-1 ring-black/5 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                {filteredPacientes.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400 font-medium">
                    No se encontraron pacientes para &quot;{search}&quot;
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {filteredPacientes.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPacienteId(p.id);
                          setIsDropdownOpen(false);
                          setSearch("");
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-xs rounded-lg hover:bg-blue-50/50 hover:text-blue-700 transition-all duration-150 flex items-center justify-between group"
                      >
                        <div>
                          <span className="font-semibold text-slate-700 group-hover:text-blue-700">{p.nombreCompleto}</span>
                          <span className="ml-2 font-mono text-slate-400 text-3xs bg-slate-100 px-1.5 py-0.5 rounded-md group-hover:bg-blue-100/50 group-hover:text-blue-600">DNI: {p.id}</span>
                        </div>
                        {p.telefono && (
                          <span className="text-3xs text-slate-400 font-medium">📞 {p.telefono}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {selectedPaciente && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xl font-bold text-indigo-700">
                {patientInitial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">
                    {selectedPaciente.nombreCompleto}
                  </h3>
                  <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    Paciente Activo
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-6 border-t border-slate-100 pt-4 md:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">DNI</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900 font-mono">{selectedPaciente.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Teléfono</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">
                      {selectedPaciente.telefono || "Sin registrar"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fecha de nacimiento</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">
                      {formatDateEsAr(selectedPaciente.fechaNacimiento)}
                      {edad !== null && ` (${edad} años)`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dirección</p>
                    <p className="mt-0.5 truncate text-sm font-medium text-slate-900" title={selectedPaciente.direccion}>
                      {selectedPaciente.direccion || "Sin registrar"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-start no-print">
              <button
                type="button"
                onClick={() => setIsEditingPaciente(true)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmation({
                    id: selectedPaciente.id,
                    type: "paciente",
                    title: "Eliminar Paciente",
                    details: `Nombre: ${selectedPaciente.nombreCompleto} (DNI: ${selectedPaciente.id})`
                  });
                }}
                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditingPaciente && selectedPaciente && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <form 
              action={onUpdatePaciente}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
               <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                 <div className="flex items-center gap-2.5">
                   <span className="text-xl">✏️</span>
                   <div>
                     <h3 className="text-sm font-extrabold text-slate-800">
                       Editar Información del Paciente
                     </h3>
                     <p className="text-3xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                       Modificar los datos clínicos del paciente
                     </p>
                   </div>
                 </div>
                 <button 
                   type="button" 
                   onClick={() => setIsEditingPaciente(false)}
                   className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-full transition-all"
                 >
                   ✕
                 </button>
               </div>

               <div className="grid gap-4 md:grid-cols-2">
                 <div className="space-y-1">
                   <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">DNI / Identificación (No editable)</label>
                   <input 
                     className="input bg-slate-50 border-slate-100 cursor-not-allowed text-slate-500 font-medium font-mono" 
                     value={selectedPaciente.id} 
                     readOnly 
                   />
                 </div>

                 <div className="space-y-1">
                   <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Nombre Completo</label>
                   <input 
                     className="input bg-white" 
                     name="nombreCompleto" 
                     defaultValue={selectedPaciente.nombreCompleto} 
                     required 
                   />
                 </div>

                 <div className="space-y-1">
                   <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Teléfono</label>
                   <input 
                     className="input bg-white" 
                     name="telefono" 
                     defaultValue={selectedPaciente.telefono || ""} 
                     placeholder="Ej. 3794123456"
                   />
                 </div>

                 <div className="space-y-1">
                   <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Fecha de Nacimiento</label>
                   <input 
                     className="input bg-white" 
                     name="fechaNacimiento" 
                     type="date" 
                     defaultValue={fechaNacimientoToInputValue(selectedPaciente.fechaNacimiento)} 
                   />
                 </div>

                 <div className="md:col-span-2 space-y-1">
                   <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Dirección</label>
                   <input 
                     className="input bg-white" 
                     name="direccion" 
                     defaultValue={selectedPaciente.direccion || ""} 
                     placeholder="Ej. Av. Libertad 5400"
                   />
                 </div>
               </div>

               <div className="flex items-center gap-2 justify-end mt-2">
                 <button
                   type="button"
                   onClick={() => setIsEditingPaciente(false)}
                   className="btn-secondary py-2 px-4 text-3xs font-extrabold"
                 >
                   Cancelar
                 </button>
                 <button
                   type="submit"
                   className="btn-primary py-2 px-4 text-3xs font-extrabold"
                 >
                   Guardar Cambios
                 </button>
               </div>
            </form>
          </div>
        )}

      {isRegisteringPaciente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <form
            action={onCreatePaciente}
            className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Registrar nuevo paciente</h3>
                <p className="mt-0.5 text-sm text-slate-500">Completá los datos para crear una nueva ficha.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisteringPaciente(false)}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="input" name="id" placeholder="DNI" required />
              <input className="input" name="nombreCompleto" placeholder="Nombre completo" required />
              <input className="input" name="telefono" placeholder="Teléfono" />
              <input className="input" name="fechaNacimiento" type="date" />
              <input className="input md:col-span-2" name="direccion" placeholder="Dirección" />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsRegisteringPaciente(false)}
                className="btn-secondary px-4 py-2 text-xs font-bold"
              >
                Cancelar
              </button>
              <button className="btn-primary px-4 py-2 text-xs font-bold" type="submit">
                Guardar paciente
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedPaciente && (
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div
            role="tablist"
            aria-label="Submenú de paciente"
            className="inline-flex gap-1 rounded-xl bg-slate-100 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeForm === "clinica"}
              onClick={() => setActiveForm("clinica")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeForm === "clinica"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Atención Clínica
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeForm === "caja"}
              onClick={() => setActiveForm("caja")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeForm === "caja"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Agregar Factura
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeForm === "historial"}
              onClick={() => setActiveForm("historial")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeForm === "historial"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ver Historial
            </button>
          </div>

          {activeForm === "clinica" && (
            <form onSubmit={onSubmitClinica} className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/20 p-4 md:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1">
                <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Fecha de Atención</label>
                <input className="input bg-white" name="fechaAtencion" type="date" required />
              </div>
              <div className="space-y-1">
                <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Servicio</label>
                <select className="input bg-white" name="servicio" required>
                  <option value="">Selecciona servicio...</option>
                  {servicios.map((s) => (
                    <option key={s.id} value={s.nombre}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Agregar prácticas múltiples */}
              <div className="md:col-span-2 space-y-2 border border-slate-100 bg-white p-3.5 rounded-xl shadow-sm">
                <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Prácticas Clínicas Realizadas</label>
                <div className="flex gap-2">
                  <select 
                    className="input bg-slate-50/50" 
                    value={currentPractica}
                    onChange={(e) => setCurrentPractica(e.target.value)}
                  >
                    <option value="">Selecciona una práctica para agregar...</option>
                    {practicas.map((p) => (
                      <option key={p.id} value={p.nombre}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    onClick={handleAddPractica}
                    className="btn-primary py-2 px-4 shrink-0 text-xs font-bold"
                  >
                    ＋ Agregar
                  </button>
                </div>

                {/* Lista de prácticas agregadas */}
                {selectedPracticas.length > 0 ? (
                  <div className="mt-2.5 space-y-1.5">
                    <p className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Prácticas seleccionadas ({selectedPracticas.length}):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPracticas.map((practica, idx) => (
                        <span 
                          key={idx} 
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 animate-in zoom-in-95 duration-150"
                        >
                          {practica}
                          <button 
                            type="button" 
                            onClick={() => setSelectedPracticas(selectedPracticas.filter((_, i) => i !== idx))}
                            className="text-red-500 hover:text-red-700 transition-colors text-3xs p-0.5 rounded-full hover:bg-red-50"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-3xs font-medium text-amber-600 bg-amber-50/50 p-2 rounded-lg border border-amber-100/30">
                    ⚠️ Debes agregar al menos una práctica usando el selector y el botón &quot;＋ Agregar&quot;.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-3xs font-bold uppercase tracking-wider text-slate-500">Odontólogo Responsable</label>
                <select className="input bg-white" name="odontologoResponsable" required>
                  <option value="">Selecciona odontólogo responsable...</option>
                  {profesionalesActivos.map((p) => (
                    <option key={p.id} value={p.nombreCompleto}>
                      {p.nombreCompleto}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-3xs font-bold uppercase tracking-wider text-slate-500">Pasante (Opcional)</label>
                <select className="input bg-white" name="pasante">
                  <option value="">Sin pasante...</option>
                  {pasantesActivos.map((p) => (
                    <option key={p.id} value={p.nombreCompleto}>
                      {p.nombreCompleto}
                    </option>
                  ))}
                </select>
              </div>

              <button className="btn-primary md:col-span-2 py-3 mt-2 text-xs font-bold tracking-wide" type="submit">
                Guardar atención clínica ({selectedPracticas.length} prácticas)
              </button>
            </form>
          )}

          {activeForm === "caja" && (
            <CajaForm
              arancelesActivos={arancelesActivos}
              servicios={servicios}
              profesionalesActivos={profesionalesActivos}
              onSubmitCaja={onSubmitCaja}
            />
          )}

          {activeForm === "historial" && (
            <div className="space-y-6 rounded-xl border border-slate-100 bg-slate-50/20 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span>📋</span> Historial de {selectedPaciente.nombreCompleto}
                </h3>
                <button
                  type="button"
                  onClick={() => loadHistorial(selectedPaciente.id)}
                  disabled={loadingHistorial}
                  className="text-3xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 bg-white border border-slate-200/50 px-2 py-1 rounded-lg shadow-sm"
                >
                  🔄 {loadingHistorial ? "Cargando..." : "Actualizar Historial"}
                </button>
              </div>

              {loadingHistorial ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium animate-pulse">
                  Cargando historial del paciente...
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Historial de Prácticas */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>🏥</span> Prácticas Clínicas Realizadas ({historialPracticas.length})
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm max-h-60 overflow-y-auto">
                      <table className="min-w-full text-left text-xs font-sans">
                        <thead className="bg-slate-50 border-b border-slate-100 text-3xs font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="p-2.5">Fecha</th>
                            <th className="p-2.5">Servicio</th>
                            <th className="p-2.5">Práctica Realizada</th>
                            <th className="p-2.5">Odontólogo</th>
                            <th className="p-2.5 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700">
                          {historialPracticas.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-slate-400 text-3xs font-medium">
                                No se encontraron registros clínicos para este paciente.
                              </td>
                            </tr>
                          ) : (
                            historialPracticas.map((p, idx) => (
                              <tr key={p.id || idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-2.5 font-medium whitespace-nowrap">
                                  {formatDateEsAr(p.fechaAtencion)}
                                </td>
                                <td className="p-2.5">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-3xs font-semibold bg-slate-100 text-slate-600">
                                    {p.servicio}
                                  </span>
                                </td>
                                <td className="p-2.5 font-semibold text-slate-800">{p.practicaRealizada}</td>
                                <td className="p-2.5 text-slate-500">
                                  <div>{p.odontologoResponsable}</div>
                                  {p.pasante && (
                                    <div className="text-3xs text-slate-400 font-medium italic mt-0.5">
                                      Pasante: {p.pasante}
                                    </div>
                                  )}
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const dateStr = formatDateEsAr(p.fechaAtencion);
                                      setDeleteConfirmation({
                                        id: p.id || "",
                                        type: "practica",
                                        title: "Eliminar Atención Clínica",
                                        details: `${p.practicaRealizada} (${p.servicio}) - Odontólogo: ${p.odontologoResponsable}${p.pasante ? ` (Pasante: ${p.pasante})` : ""} - Fecha: ${dateStr}`
                                      });
                                    }}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                    title="Eliminar práctica clínica"
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Deudas activas (solo saldo > 0) */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-red-700 flex items-center gap-1">
                      <span>⚠️</span> Deudas pendientes ({deudasPendientes.length})
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm max-h-48 overflow-y-auto">
                      <table className="min-w-full text-left text-xs font-sans">
                        <thead className="bg-red-50/50 border-b border-red-100 text-3xs font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="p-2.5">Recibo</th>
                            <th className="p-2.5">Práctica</th>
                            <th className="p-2.5 text-right">Saldo</th>
                            <th className="p-2.5 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700">
                          {deudasPendientes.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-green-600 text-3xs font-semibold">
                                Sin deudas activas. Todas las prácticas cobradas están al día.
                              </td>
                            </tr>
                          ) : (
                            deudasPendientes.map((inv, idx) => (
                              <tr key={inv.id || idx} className="hover:bg-red-50/20 transition-colors">
                                <td className="p-2.5 font-mono font-bold text-slate-500">{inv.id}</td>
                                <td className="p-2.5">
                                  <div className="font-semibold text-slate-800">{inv.practicaCobradaDetalle}</div>
                                  <div className="text-3xs text-slate-400">{inv.servicioAsociado}</div>
                                </td>
                                <td className="p-2.5 text-right font-bold text-red-600 whitespace-nowrap">
                                  {formatMoney(inv.saldoPendiente)}
                                </td>
                                <td className="p-2.5 text-center whitespace-nowrap space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => setPayingInvoice(inv)}
                                    className="inline-flex items-center gap-1 text-3xs font-extrabold text-green-600 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-lg border border-green-200/40"
                                  >
                                    💵 Abonar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setViewingPagosFacturaId(inv.id ?? null)}
                                    className="inline-flex items-center text-3xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg"
                                  >
                                    📜 Abonos
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Historial de cargos y facturación */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>💰</span> Historial de cargos ({historialInvoices.length})
                    </h4>
                    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm max-h-60 overflow-y-auto">
                      <table className="min-w-full text-left text-xs font-sans">
                        <thead className="bg-slate-50 border-b border-slate-100 text-3xs font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="p-2.5">Recibo</th>
                            <th className="p-2.5">Fecha</th>
                            <th className="p-2.5">Servicio / Práctica Cobrada</th>
                            <th className="p-2.5 text-right">Total</th>
                            <th className="p-2.5 text-right">Abonado</th>
                            <th className="p-2.5 text-right">Pendiente</th>
                            <th className="p-2.5 text-center">Estado</th>
                            <th className="p-2.5 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700">
                          {historialInvoices.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-4 text-center text-slate-400 text-3xs font-medium">
                                No se encontraron registros de caja para este paciente.
                              </td>
                            </tr>
                          ) : (
                            historialInvoices.map((inv, idx) => {
                              const isDeudor = inv.saldoPendiente > 0;
                              const cantAbonos = pagosPorFactura[inv.id ?? ""]?.length ?? 0;
                              return (
                                <tr key={inv.id || idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="p-2.5 font-mono font-bold text-slate-500">{inv.id}</td>
                                  <td className="p-2.5 font-medium whitespace-nowrap">{formatFecha(inv.fecha)}</td>
                                  <td className="p-2.5">
                                    <div className="font-semibold text-slate-800">{inv.practicaCobradaDetalle}</div>
                                    <div className="text-3xs text-slate-400">{inv.servicioAsociado}</div>
                                  </td>
                                  <td className="p-2.5 text-right font-semibold whitespace-nowrap">
                                    {formatMoney(inv.costoTotal)}
                                  </td>
                                  <td className="p-2.5 text-right font-semibold text-green-600 whitespace-nowrap">
                                    {formatMoney(inv.montoAbonado)}
                                  </td>
                                  <td className="p-2.5 text-right font-semibold whitespace-nowrap">
                                    <span className={isDeudor ? "text-red-600" : "text-slate-500"}>
                                      {formatMoney(inv.saldoPendiente)}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center whitespace-nowrap">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs font-bold border ${
                                        isDeudor
                                          ? "bg-red-50 text-red-700 border-red-100"
                                          : "bg-green-50 text-green-700 border-green-100"
                                      }`}
                                    >
                                      {inv.estado === "PARCIAL" ? "PARCIAL" : isDeudor ? "DEUDA" : "PAGADO"}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center whitespace-nowrap space-x-1">
                                    <button
                                      type="button"
                                      onClick={() => setViewingPagosFacturaId(inv.id ?? null)}
                                      className="inline-flex items-center text-3xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg"
                                      title={`${cantAbonos} abono(s) registrado(s)`}
                                    >
                                      📜 ({cantAbonos})
                                    </button>
                                    {isDeudor && (
                                      <button
                                        type="button"
                                        onClick={() => setPayingInvoice(inv)}
                                        className="inline-flex items-center gap-1 text-3xs font-extrabold text-green-600 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-lg border border-green-200/40"
                                      >
                                        💵
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeleteConfirmation({
                                          id: inv.id || "",
                                          type: "facturacion",
                                          title: "Eliminar Factura / Recibo",
                                          details: `Recibo: ${inv.id} - ${inv.practicaCobradaDetalle} (${inv.servicioAsociado}) - Total: ${formatMoney(inv.costoTotal)} - Fecha: ${formatFecha(inv.fecha)}`
                                        });
                                      }}
                                      className="inline-flex items-center text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg"
                                    >
                                      🗑️
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
      {message && (
        <div className={`rounded-xl border p-4 text-xs font-semibold shadow-sm animate-in fade-in duration-300 flex items-start justify-between gap-3 ${
          message.toLowerCase().includes("error") || message.toLowerCase().includes("ya existe") || message.toLowerCase().includes("ya se encuentra")
            ? "border-red-200 bg-red-50/70 text-red-800"
            : "border-green-200 bg-green-50/70 text-green-800"
        }`}>
          <div className="flex items-start gap-2.5">
            <span className="text-sm">
              {message.toLowerCase().includes("error") || message.toLowerCase().includes("ya existe") || message.toLowerCase().includes("ya se encuentra") ? "⚠️" : "✨"}
            </span>
            <div>
              <p className="font-bold">
                {message.toLowerCase().includes("error") || message.toLowerCase().includes("ya existe") || message.toLowerCase().includes("ya se encuentra")
                  ? "Atención / Aviso del Sistema"
                  : "Operación Exitosa"}
              </p>
              <p className={`mt-0.5 text-3xs font-medium leading-normal ${
                message.toLowerCase().includes("error") || message.toLowerCase().includes("ya existe") || message.toLowerCase().includes("ya se encuentra")
                  ? "text-red-700"
                  : "text-green-700"
              }`}>{message}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => setMessage("")}
            className={`p-1 rounded-full transition-all shrink-0 font-bold ${
              message.toLowerCase().includes("error") || message.toLowerCase().includes("ya existe") || message.toLowerCase().includes("ya se encuentra")
                ? "text-red-400 hover:text-red-600 hover:bg-red-100/50"
                : "text-green-400 hover:text-green-600 hover:bg-green-100/50"
            }`}
          >
            ✕
          </button>
        </div>
      )}

      {deleteConfirmation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center text-lg font-bold shrink-0 border border-red-100">
                ⚠️
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">
                  {deleteConfirmation.title}
                </h3>
                <p className="text-3xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-600 leading-relaxed font-medium">
              {deleteConfirmation.type === "paciente" 
                ? "¿Estás seguro de que deseas eliminar permanentemente a este paciente? Se borrará su ficha técnica de la base de datos:"
                : "¿Estás seguro de que deseas eliminar este registro del historial?"}
              <div className="mt-2.5 font-mono text-3xs text-slate-500 bg-white p-2 rounded-lg border border-slate-200/50 break-words font-semibold leading-normal">
                {deleteConfirmation.details}
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(null)}
                className="btn-secondary py-2 px-4 text-3xs font-extrabold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="btn bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-100 hover:shadow-md hover:shadow-red-200 py-2 px-4 text-3xs font-extrabold"
              >
                Confirmar y Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {payingInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <form 
            action={onSubmitPagoSaldo}
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">💰</span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    Registrar Pago de Saldo
                  </h3>
                  <p className="text-3xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Recibo de Referencia: #{payingInvoice.id}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setPayingInvoice(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-full transition-all"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Práctica Cobrada</label>
                <input 
                  className="input bg-slate-50 border-slate-100 cursor-not-allowed text-slate-500 font-medium" 
                  value={payingInvoice.practicaCobradaDetalle} 
                  readOnly 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Servicio Asociado</label>
                <input 
                  className="input bg-slate-50 border-slate-100 cursor-not-allowed text-slate-500 font-medium" 
                  value={payingInvoice.servicioAsociado} 
                  readOnly 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-3xs font-bold uppercase tracking-wider text-slate-500">Saldo Anterior a Pagar</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-slate-400 pointer-events-none">$</span>
                  <input 
                    className="input !pl-8 bg-amber-50 border-amber-200/50 text-amber-800 font-extrabold cursor-not-allowed" 
                    value={payingInvoice.saldoPendiente} 
                    readOnly 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-3xs font-bold uppercase tracking-wider text-slate-500">N° Recibo del abono</label>
                <input 
                  className="input" 
                  name="recibo" 
                  placeholder="Ej. ABO-2024-015 (único por abono)" 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-3xs font-bold uppercase tracking-wider text-slate-500">Fecha de Pago</label>
                <input 
                  className="input" 
                  name="fecha" 
                  type="date" 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Monto a Abonar</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-slate-400 pointer-events-none">$</span>
                  <input 
                    className="input !pl-8 border-green-300 focus:border-green-500 focus:ring-green-500/10 font-bold" 
                    name="montoAbonado" 
                    type="number" 
                    step="0.01" 
                    max={payingInvoice.saldoPendiente}
                    placeholder={`Máx. ${payingInvoice.saldoPendiente}`}
                    required 
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Detalle Adicional</label>
                <input 
                  className="input" 
                  name="detalleAdicional" 
                  placeholder="Detalle de este abono..." 
                  defaultValue={`Abono de saldo para Recibo #${payingInvoice.id}`}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end mt-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="btn-secondary py-2.5 px-4 text-3xs font-extrabold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-100 hover:shadow-md hover:shadow-green-200 py-2.5 px-5 text-3xs font-extrabold tracking-wider uppercase"
              >
                Guardar Abono de Caja
              </button>
            </div>
          </form>
        </div>
      )}

      {viewingPagosFacturaId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div
            className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 flex flex-col gap-4 animate-in slide-in-from-bottom-8 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">Historial de abonos</h3>
                <p className="text-3xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Cargo / Recibo #{viewingPagosFacturaId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPagosFacturaId(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-full"
              >
                ✕
              </button>
            </div>

            {pagosFacturaSeleccionada.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                No hay abonos registrados en el nuevo sistema para este cargo.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-100 max-h-64 overflow-y-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-3xs font-bold uppercase text-slate-500">
                    <tr>
                      <th className="p-2 text-left">Fecha</th>
                      <th className="p-2 text-left">Recibo</th>
                      <th className="p-2 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {pagosFacturaSeleccionada.map((p, i) => (
                      <tr key={p.id || i}>
                        <td className="p-2 font-medium">{formatFecha(p.fechaPago)}</td>
                        <td className="p-2 font-mono text-3xs">{p.numeroRecibo || p.id}</td>
                        <td className="p-2 text-right font-bold text-green-600">{formatMoney(p.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-100">
                    <tr>
                      <td colSpan={2} className="p-2 text-3xs font-bold uppercase text-slate-500">
                        Total abonado
                      </td>
                      <td className="p-2 text-right font-extrabold text-slate-800">
                        {formatMoney(pagosFacturaSeleccionada.reduce((s, p) => s + p.monto, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            <button
              type="button"
              onClick={() => setViewingPagosFacturaId(null)}
              className="btn-secondary py-2 text-3xs font-extrabold self-end"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type ArancelConCantidad = {
  arancel: Arancel;
  cantidad: number;
};

function CajaForm({
  arancelesActivos,
  servicios,
  profesionalesActivos,
  onSubmitCaja
}: {
  arancelesActivos: Arancel[];
  servicios: Servicio[];
  profesionalesActivos: Profesional[];
  onSubmitCaja: (formData: FormData) => Promise<void>;
}) {
  const [selectedAranceles, setSelectedAranceles] = useState<ArancelConCantidad[]>([]);
  const [montoAbonado, setMontoAbonado] = useState(0);
  const [searchPractice, setSearchPractice] = useState("");
  const [cantidadAgregar, setCantidadAgregar] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  const costoTotal = selectedAranceles.reduce(
    (sum, item) => sum + item.arancel.valor * item.cantidad,
    0
  );

  function agregarArancel(arancel: Arancel, cantidad: number) {
    const qty = Math.max(1, cantidad);
    setSelectedAranceles((prev) => {
      const idx = prev.findIndex((x) => x.arancel.id === arancel.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], cantidad: next[idx].cantidad + qty };
        return next;
      }
      return [...prev, { arancel, cantidad: qty }];
    });
  }

  function actualizarCantidad(idx: number, cantidad: number) {
    const qty = Math.max(1, cantidad);
    setSelectedAranceles((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, cantidad: qty } : item))
    );
  }
  const saldo = costoTotal - montoAbonado;

  // Custom smart match for aranceles
  const filteredAranceles = useMemo(() => {
    const q = cleanText(searchPractice);
    if (!q) return arancelesActivos;

    return arancelesActivos.filter((a) => {
      const idClean = cleanText(a.id);
      const descClean = cleanText(a.detallePractica);
      const capClean = cleanText(a.capitulo || "");

      if (idClean.includes(q) || descClean.includes(q) || capClean.includes(q)) {
        return true;
      }

      const queryWords = q.split(/\s+/).filter(Boolean);
      const descWords = descClean.split(/\s+/).filter(Boolean);

      return queryWords.every((qW) => {
        if (idClean.startsWith(qW)) return true;
        return descWords.some((dW) => matchWordFuzzy(qW, dW));
      });
    });
  }, [searchPractice, arancelesActivos]);

  return (
    <form onSubmit={(e) => {
      if (selectedAranceles.length === 0) {
        e.preventDefault();
        alert("Debes agregar al menos una práctica antes de guardar.");
      }
    }} action={onSubmitCaja} className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 md:grid-cols-2 shadow-sm animate-in fade-in duration-300">
      <div className="space-y-1">
        <label className="block text-3xs font-bold uppercase tracking-wider text-slate-500">N° Recibo de cobro</label>
        <input className="input" name="recibo" placeholder="N° Recibo" required />
      </div>
      <div className="space-y-1">
        <label className="block text-3xs font-bold uppercase tracking-wider text-slate-500">Fecha de Emisión</label>
        <input className="input" name="fecha" type="date" required />
      </div>

      {/* Searchable Intelligent Practice Selector */}
      <div className="md:col-span-2 space-y-1 relative">
        <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">
          Buscar y Agregar Prácticas
        </label>
        <div className="flex gap-2">
          <div className="relative flex flex-1 items-center">
            <input
              className="input pr-10 bg-slate-50/30"
              placeholder="Buscar consulta, cirugía, operatoria dental... Ej: 01.01"
              value={searchPractice}
              onChange={(e) => {
                setSearchPractice(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
            />
            {searchPractice && (
              <button
                type="button"
                onClick={() => {
                  setSearchPractice("");
                  setIsOpen(false);
                }}
                className="absolute right-3 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
              >
                ✕
              </button>
            )}
          </div>
          <div className="w-24 shrink-0 space-y-1">
            <label className="block text-4xs font-bold uppercase tracking-wider text-slate-400 text-center">
              Cant.
            </label>
            <input
              className="input text-center font-bold"
              type="number"
              min={1}
              step={1}
              value={cantidadAgregar}
              onChange={(e) => setCantidadAgregar(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        </div>

        {/* Hidden Fields for Form Submission compatibility */}
        <input
          type="hidden"
          name="practicaCobradaId"
          value={selectedAranceles
            .map(({ arancel, cantidad }) =>
              cantidad > 1 ? `${arancel.id} (×${cantidad})` : arancel.id
            )
            .join(", ")}
          required
        />
        <input
          type="hidden"
          name="practicaCobradaDetalle"
          value={selectedAranceles
            .map(({ arancel, cantidad }) =>
              cantidad > 1
                ? `${arancel.detallePractica} (×${cantidad})`
                : arancel.detallePractica
            )
            .join(" + ")}
          required
        />

        {/* Dropdown Results List */}
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute left-0 right-0 mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200/80 bg-white/95 backdrop-blur-md p-2 shadow-lg ring-1 ring-black/5 z-20 animate-in fade-in slide-in-from-top-1 duration-150">
              {filteredAranceles.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 font-medium">
                  No se encontraron prácticas para &quot;{searchPractice}&quot;
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredAranceles.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        agregarArancel(a, cantidadAgregar);
                        setSearchPractice("");
                        setCantidadAgregar(1);
                        setIsOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-green-50 hover:text-green-700 transition-all duration-100 flex items-center justify-between text-xs group"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="font-semibold text-slate-700 group-hover:text-green-700 truncate block">
                          {a.detallePractica}
                        </span>
                        {a.capitulo && (
                          <span className="text-4xs uppercase tracking-wider text-slate-400 font-bold">
                            📂 {a.capitulo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-3xs bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-500 font-bold group-hover:bg-green-100 group-hover:text-green-600">
                          {a.id}
                        </span>
                        <span className="font-bold text-slate-700 group-hover:text-green-700">
                          {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(a.valor)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Lista de Prácticas seleccionadas en la Factura */}
      {selectedAranceles.length > 0 ? (
        <div className="md:col-span-2 space-y-2 border border-blue-50/30 bg-blue-50/10 p-3.5 rounded-xl">
          <p className="text-3xs font-extrabold text-blue-500 uppercase tracking-wider">
            Prácticas a Facturar ({selectedAranceles.length} ítems, {selectedAranceles.reduce((s, i) => s + i.cantidad, 0)} unidades):
          </p>
          <div className="flex flex-col gap-1.5">
            {selectedAranceles.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 p-2.5 rounded-lg text-xs shadow-3xs animate-in zoom-in-95 duration-100">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="font-mono text-4xs bg-slate-50 text-slate-500 font-bold px-1.5 py-0.5 rounded border border-slate-200/20">{item.arancel.id}</span>
                  <span className="font-semibold text-slate-700 truncate" title={item.arancel.detallePractica}>{item.arancel.detallePractica}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <label className="text-4xs font-bold uppercase tracking-wider text-slate-400">Cant.</label>
                    <input
                      className="input w-16 text-center py-1 text-xs font-bold"
                      type="number"
                      min={1}
                      step={1}
                      value={item.cantidad}
                      onChange={(e) => actualizarCantidad(idx, Number(e.target.value) || 1)}
                    />
                  </div>
                  <span className="font-extrabold text-slate-800">
                    {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(item.arancel.valor * item.cantidad)}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedAranceles(selectedAranceles.filter((_, i) => i !== idx))}
                    className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-full transition-all font-bold"
                    title="Quitar práctica"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="md:col-span-2">
          <p className="text-3xs font-semibold text-amber-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100/30">
            ⚠️ Debes seleccionar al menos una práctica buscando en el buscador superior.
          </p>
        </div>
      )}

      <div className="space-y-1">
        <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Costo Total Prácticas</label>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-xs font-bold text-slate-400 pointer-events-none">$</span>
          <input className="input !pl-8 bg-slate-100 text-slate-500 font-extrabold" name="costoTotal" value={costoTotal} readOnly />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Monto Abonado</label>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-xs font-bold text-slate-400 pointer-events-none">$</span>
          <input
            className="input !pl-8 focus:border-blue-500 font-bold text-green-600"
            name="montoAbonado"
            type="number"
            step="0.01"
            placeholder="Monto a ingresar..."
            onChange={(e) => setMontoAbonado(Number(e.target.value))}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Saldo Pendiente</label>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-xs font-bold text-slate-400 pointer-events-none">$</span>
          <input className="input !pl-8 bg-slate-100 text-red-500 font-bold" value={saldo} readOnly />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Servicio Asociado</label>
        <select className="input bg-white" name="servicioAsociado" required>
          <option value="">Servicio asociado...</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.nombre}>
              {s.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Odontólogo Responsable</label>
        <select className="input bg-white" name="profesionalId" required>
          <option value="">Odontólogo...</option>
          {profesionalesActivos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombreCompleto}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2 space-y-1">
        <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400">Detalle Adicional</label>
        <input className="input" name="detalleAdicional" placeholder="Nota o detalle opcional..." />
      </div>

      <button 
        disabled={selectedAranceles.length === 0}
        className="btn-primary md:col-span-2 py-3 mt-2 text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
        type="submit"
      >
        💾 Guardar en facturación
      </button>
    </form>
  );
}

