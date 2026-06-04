"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  DbArancel,
  DbCatalogoPractica,
  DbFacturacion,
  DbPaciente,
  DbPagoRecibido,
  DbPracticaClinica,
  DbProfesional,
  DbServicio,
  DbPasante,
  RegistrarPagoRpcResult
} from "@/lib/supabase/database.types";
import { calcularEstadoFacturacion, normalizarFacturacion } from "@/lib/facturacion-utils";
import type {
  Arancel,
  Facturacion,
  Paciente,
  PagoRecibido,
  PracticaClinica,
  Profesional,
  Servicio,
  EstadoFacturacion,
  AppTimestamp,
  Pasante
} from "@/types";
import { toBsAsIsoString } from "@/lib/date-utils";

type TimestampLike = AppTimestamp;

function toTimestampLike(iso: string | null | undefined): TimestampLike {
  const d = iso ? new Date(iso) : new Date(0);
  return {
    toDate: () => d,
    toMillis: () => d.getTime()
  };
}

function assertNoError(error: { message: string; code?: string } | null, fallback: string): void {
  if (error) {
    if (error.code === "23505") {
      throw new Error("Ya existe un registro con ese identificador único.");
    }
    throw new Error(error.message || fallback);
  }
}

function mapPacienteRow(row: DbPaciente): Paciente {
  return {
    id: row.id,
    nombreCompleto: row.nombre_completo,
    telefono: row.telefono ?? undefined,
    fechaNacimiento: row.fecha_nacimiento ?? undefined,
    direccion: row.direccion ?? undefined,
    fechaAlta: toTimestampLike(row.fecha_alta)
  };
}

function mapProfesionalRow(row: DbProfesional): Profesional {
  return { id: row.id, nombreCompleto: row.nombre_completo, activo: row.activo };
}

function mapServicioRow(row: DbServicio): Servicio {
  return { id: row.id, nombre: row.nombre };
}

function mapArancelRow(row: DbArancel): Arancel {
  return {
    id: row.id,
    detallePractica: row.detalle_practica,
    valor: Number(row.valor),
    capitulo: row.capitulo,
    activo: row.activo
  };
}

function mapFacturacionRow(row: DbFacturacion): Facturacion {
  return normalizarFacturacion({
    id: row.id,
    fecha: toTimestampLike(row.fecha),
    pacienteId: row.paciente_id,
    pacienteNombre: row.paciente_nombre,
    practicaCobradaId: row.practica_cobrada_id,
    practicaCobradaDetalle: row.practica_cobrada_detalle,
    servicioAsociado: row.servicio_asociado,
    costoTotal: Number(row.costo_total),
    montoAbonado: Number(row.monto_abonado),
    saldoPendiente: Number(row.saldo_pendiente),
    estado: row.estado,
    profesionalId: row.profesional_id,
    detalleAdicional: row.detalle_adicional ?? undefined,
    eliminado: row.eliminado,
    fechaEliminacion: row.fecha_eliminacion
      ? toTimestampLike(row.fecha_eliminacion)
      : undefined
  });
}

function mapPagoRecibidoRow(row: DbPagoRecibido): PagoRecibido {
  return {
    id: row.id,
    facturacionId: row.facturacion_id,
    pacienteId: row.paciente_id,
    monto: Number(row.monto),
    fechaPago: toTimestampLike(row.fecha_pago),
    numeroRecibo: row.numero_recibo,
    observaciones: row.observaciones ?? undefined
  };
}

function mapPracticaClinicaRow(row: DbPracticaClinica): PracticaClinica {
  return {
    id: row.id,
    pacienteId: row.paciente_id,
    pacienteNombre: row.paciente_nombre,
    fechaAtencion: toTimestampLike(row.fecha_atencion),
    servicio: row.servicio,
    practicaRealizada: row.practica_realizada,
    odontologoResponsable: row.odontologo_responsable,
    pasante: row.pasante ?? undefined
  };
}

function mapPasanteRow(row: DbPasante): Pasante {
  return {
    id: row.id,
    nombreCompleto: row.nombre_completo,
    telefono: row.telefono ?? undefined,
    activo: row.activo
  };
}

// --- Pacientes / búsqueda ---

export async function buscarPacientes(
  query: string,
  opts?: { limit?: number }
): Promise<Paciente[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("buscar_pacientes", {
    p_query: query.trim(),
    p_limit: opts?.limit ?? 50
  });
  assertNoError(error, "Error al buscar pacientes.");
  return (data as DbPaciente[] | null ?? []).map(mapPacienteRow);
}

export async function getPacientes(): Promise<Paciente[]> {
  return buscarPacientes("", { limit: 500 });
}

export async function getPacienteById(id: string): Promise<Paciente | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("pacientes").select("*").eq("id", id).maybeSingle();
  assertNoError(error, "Error al obtener paciente.");
  return data ? mapPacienteRow(data as DbPaciente) : null;
}

export async function createPaciente(data: {
  id: string;
  nombreCompleto: string;
  telefono?: string;
  fechaNacimiento?: string;
  direccion?: string;
}) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("pacientes").insert({
    id: data.id.trim(),
    nombre_completo: data.nombreCompleto.trim(),
    telefono: data.telefono?.trim() || null,
    fecha_nacimiento: data.fechaNacimiento || null,
    direccion: data.direccion?.trim() || null
  });
  assertNoError(error, "Error al crear paciente.");
}

export async function updatePaciente(
  id: string,
  data: {
    nombreCompleto: string;
    telefono?: string;
    fechaNacimiento?: string;
    direccion?: string;
  }
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("pacientes")
    .update({
      nombre_completo: data.nombreCompleto.trim(),
      telefono: data.telefono?.trim() || null,
      fecha_nacimiento: data.fechaNacimiento || null,
      direccion: data.direccion?.trim() || null
    })
    .eq("id", id);
  assertNoError(error, "Error al actualizar paciente.");
}

export async function deletePaciente(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("pacientes").delete().eq("id", id);
  assertNoError(error, "Error al eliminar paciente.");
}

// --- Catálogos ---

export async function getProfesionales(opts?: { onlyActive?: boolean }) {
  const supabase = getSupabaseClient();
  let q = supabase.from("profesionales").select("*").order("nombre_completo");
  if (opts?.onlyActive) q = q.eq("activo", true);
  const { data, error } = await q;
  assertNoError(error, "Error al obtener profesionales.");
  return (data as DbProfesional[]).map(mapProfesionalRow);
}

export async function setProfesionalActivo(id: string, activo: boolean) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("profesionales").update({ activo }).eq("id", id);
  assertNoError(error, "Error al actualizar profesional.");
}

export async function createProfesional(data: { nombreCompleto: string; activo?: boolean }) {
  const nombre = data.nombreCompleto.trim();
  if (!nombre) throw new Error("El nombre del profesional es obligatorio.");
  const supabase = getSupabaseClient();
  const { data: row, error } = await supabase
    .from("profesionales")
    .insert({ nombre_completo: nombre, activo: data.activo ?? true })
    .select("id")
    .single();
  assertNoError(error, "Error al crear profesional.");
  return (row as { id: string }).id;
}

export async function deleteProfesional(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("profesionales").delete().eq("id", id);
  assertNoError(error, "Error al eliminar profesional.");
}

export async function getAranceles(opts?: { onlyActive?: boolean }) {
  const supabase = getSupabaseClient();
  let q = supabase.from("aranceles").select("*").order("detalle_practica");
  if (opts?.onlyActive) q = q.eq("activo", true);
  const { data, error } = await q;
  assertNoError(error, "Error al obtener aranceles.");
  return (data as DbArancel[]).map(mapArancelRow);
}

export async function setArancelActivo(id: string, activo: boolean) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("aranceles").update({ activo }).eq("id", id);
  assertNoError(error, "Error al actualizar arancel.");
}

export async function updateArancelValor(id: string, valor: number) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("aranceles").update({ valor }).eq("id", id);
  assertNoError(error, "Error al actualizar valor del arancel.");
}

export async function createArancel(data: {
  id: string;
  detallePractica: string;
  valor: number;
  capitulo: string;
  activo?: boolean;
}) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("aranceles").insert({
    id: data.id.trim(),
    detalle_practica: data.detallePractica.trim(),
    valor: data.valor,
    capitulo: data.capitulo.trim(),
    activo: data.activo ?? true
  });
  assertNoError(error, "Error al crear arancel.");
}

export async function getServicios() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("servicios").select("*").order("nombre");
  assertNoError(error, "Error al obtener servicios.");
  return (data as DbServicio[]).map(mapServicioRow);
}

export async function getCatalogoPracticasClinicas(opts?: { onlyActive?: boolean }) {
  const supabase = getSupabaseClient();
  let q = supabase.from("catalogo_practicas_clinicas").select("*").order("nombre");
  if (opts?.onlyActive) q = q.eq("activo", true);
  const { data, error } = await q;
  assertNoError(error, "Error al obtener prácticas del catálogo.");
  return (data as DbCatalogoPractica[]).map((r) => ({
    id: r.id,
    nombre: r.nombre,
    activo: r.activo
  }));
}

export async function createCatalogoPractica(data: { nombre: string; activo?: boolean }) {
  const nombre = data.nombre.trim();
  if (!nombre) throw new Error("El nombre de la práctica es obligatorio.");
  const supabase = getSupabaseClient();
  const { data: row, error } = await supabase
    .from("catalogo_practicas_clinicas")
    .insert({ nombre, activo: data.activo ?? true })
    .select("id")
    .single();
  assertNoError(error, "Error al crear práctica en catálogo.");
  return (row as { id: string }).id;
}

export async function deleteCatalogoPractica(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("catalogo_practicas_clinicas").delete().eq("id", id);
  assertNoError(error, "Error al eliminar práctica del catálogo.");
}

export async function setCatalogoPracticaActiva(id: string, activo: boolean) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("catalogo_practicas_clinicas")
    .update({ activo })
    .eq("id", id);
  assertNoError(error, "Error al actualizar práctica del catálogo.");
}

// --- Clínica ---

export async function createPracticaClinica(
  data: Omit<PracticaClinica, "id" | "fechaAtencion"> & { fechaAtencion: string }
) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("practicas_clinicas").insert({
    paciente_id: data.pacienteId,
    paciente_nombre: data.pacienteNombre,
    fecha_atencion: toBsAsIsoString(data.fechaAtencion),
    servicio: data.servicio,
    practica_realizada: data.practicaRealizada,
    odontologo_responsable: data.odontologoResponsable,
    pasante: data.pasante || null
  });
  assertNoError(error, "Error al registrar práctica clínica.");
}

export async function getPracticasClinicas() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("practicas_clinicas")
    .select("*")
    .order("fecha_atencion", { ascending: false });
  assertNoError(error, "Error al obtener prácticas clínicas.");
  return (data as DbPracticaClinica[]).map(mapPracticaClinicaRow);
}

export async function getPracticasClinicasByPaciente(pacienteId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("practicas_clinicas")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("fecha_atencion", { ascending: false });
  assertNoError(error, "Error al obtener historial clínico.");
  return (data as DbPracticaClinica[]).map(mapPracticaClinicaRow);
}

export async function deletePracticaClinica(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("practicas_clinicas").delete().eq("id", id);
  assertNoError(error, "Error al eliminar práctica clínica.");
}

// --- Facturación ---

export async function createFacturacion(
  id: string,
  data: Omit<Facturacion, "id" | "fecha" | "saldoPendiente" | "estado"> & { fecha: string }
) {
  const supabase = getSupabaseClient();
  const saldoPendiente = Math.max(0, data.costoTotal - data.montoAbonado);
  const estado = calcularEstadoFacturacion(data.costoTotal, saldoPendiente);
  const fechaIso = toBsAsIsoString(data.fecha);

  const { error: factError } = await supabase.from("facturacion").insert({
    id: id.trim(),
    fecha: fechaIso,
    paciente_id: data.pacienteId,
    paciente_nombre: data.pacienteNombre,
    practica_cobrada_id: data.practicaCobradaId,
    practica_cobrada_detalle: data.practicaCobradaDetalle,
    servicio_asociado: data.servicioAsociado,
    costo_total: data.costoTotal,
    monto_abonado: data.montoAbonado,
    saldo_pendiente: saldoPendiente,
    estado,
    profesional_id: data.profesionalId,
    detalle_adicional: data.detalleAdicional ?? null
  });

  if (factError?.code === "23505") {
    throw new Error("Ya existe una factura registrada con este N° Recibo de cobro.");
  }
  assertNoError(factError, "Error al crear facturación.");

  if (data.montoAbonado > 0) {
    const reciboId = id.trim();
    const { error: pagoError } = await supabase.from("pagos_recibidos").insert({
      id: `${reciboId}-inicial`,
      facturacion_id: reciboId,
      paciente_id: data.pacienteId,
      monto: data.montoAbonado,
      fecha_pago: fechaIso,
      numero_recibo: reciboId,
      observaciones: data.detalleAdicional || "Pago inicial al emitir factura"
    });
    assertNoError(pagoError, "Error al registrar pago inicial.");
  }
}

export type RegistrarPagoRecibidoInput = {
  pacienteId: string;
  numeroRecibo: string;
  monto: number;
  fecha: string;
  observaciones?: string;
};

export type RegistrarPagoRecibidoResult = {
  pagoId: string;
  facturacionId: string;
  montoAbonado: number;
  saldoPendiente: number;
  estado: EstadoFacturacion;
};

export async function registrarPagoRecibido(
  facturacionId: string,
  data: RegistrarPagoRecibidoInput
): Promise<RegistrarPagoRecibidoResult> {
  const supabase = getSupabaseClient();
  const { data: result, error } = await supabase.rpc("registrar_pago_recibido", {
    p_facturacion_id: facturacionId,
    p_paciente_id: data.pacienteId,
    p_numero_recibo: data.numeroRecibo,
    p_monto: data.monto,
    p_fecha_pago: toBsAsIsoString(data.fecha),
    p_observaciones: data.observaciones ?? null
  });
  assertNoError(error, "Error al registrar el abono.");
  const row = result as RegistrarPagoRpcResult;
  return {
    pagoId: row.pagoId,
    facturacionId: row.facturacionId,
    montoAbonado: Number(row.montoAbonado),
    saldoPendiente: Number(row.saldoPendiente),
    estado: row.estado
  };
}

export async function getFacturacion() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("facturacion")
    .select("*")
    .order("fecha", { ascending: false });
  assertNoError(error, "Error al obtener facturación.");
  return (data as DbFacturacion[]).map(mapFacturacionRow);
}

export async function getFacturacionByPaciente(pacienteId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("facturacion")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("fecha", { ascending: false });
  assertNoError(error, "Error al obtener facturas del paciente.");
  return (data as DbFacturacion[]).map(mapFacturacionRow);
}

export async function deleteFacturacion(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("facturacion")
    .update({
      estado: "ANULADA",
      saldo_pendiente: 0,
      eliminado: true,
      fecha_eliminacion: new Date().toISOString()
    })
    .eq("id", id);
  assertNoError(error, "Error al anular factura.");
}

export async function getPagosRecibidos() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("pagos_recibidos")
    .select("*")
    .order("fecha_pago", { ascending: false });
  assertNoError(error, "Error al obtener pagos.");
  return (data as DbPagoRecibido[]).map(mapPagoRecibidoRow);
}

export async function getPagosByFacturacionId(facturacionId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("pagos_recibidos")
    .select("*")
    .eq("facturacion_id", facturacionId)
    .order("fecha_pago", { ascending: true });
  assertNoError(error, "Error al obtener pagos de la factura.");
  return (data as DbPagoRecibido[]).map(mapPagoRecibidoRow);
}

export async function getPagosByPaciente(pacienteId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("pagos_recibidos")
    .select("*")
    .eq("paciente_id", pacienteId)
    .order("fecha_pago", { ascending: false });
  assertNoError(error, "Error al obtener pagos del paciente.");
  return (data as DbPagoRecibido[]).map(mapPagoRecibidoRow);
}

// --- Pasantes ---

export async function getPasantes(opts?: { onlyActive?: boolean }): Promise<Pasante[]> {
  const supabase = getSupabaseClient();
  let q = supabase.from("pasantes").select("*").order("nombre_completo");
  if (opts?.onlyActive) q = q.eq("activo", true);
  const { data, error } = await q;
  assertNoError(error, "Error al obtener pasantes.");
  return (data as DbPasante[] | null ?? []).map(mapPasanteRow);
}

export async function createPasante(data: {
  id: string;
  nombreCompleto: string;
  telefono?: string;
  activo?: boolean;
}) {
  const id = data.id.trim();
  const nombre = data.nombreCompleto.trim();
  if (!id) throw new Error("El DNI (ID) del pasante es obligatorio.");
  if (!nombre) throw new Error("El nombre del pasante es obligatorio.");
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("pasantes")
    .insert({
      id,
      nombre_completo: nombre,
      telefono: data.telefono?.trim() || null,
      activo: data.activo ?? true
    });
  assertNoError(error, "Error al crear pasante.");
}

export async function setPasanteActivo(id: string, activo: boolean) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("pasantes").update({ activo }).eq("id", id);
  assertNoError(error, "Error al actualizar pasante.");
}

export async function deletePasante(id: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("pasantes").delete().eq("id", id);
  assertNoError(error, "Error al eliminar pasante.");
}
