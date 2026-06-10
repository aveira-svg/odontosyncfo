/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  DbInsumo,
  DbLoteInsumo
} from "@/lib/supabase/database.types";
import type {
  Insumo,
  LoteInsumo,
  MovimientoStock,
  AppTimestamp
} from "@/types";

function toTimestampLike(iso: string | null | undefined): AppTimestamp {
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

function mapInsumoRow(row: DbInsumo & { lotes_insumos?: DbLoteInsumo[] }): Insumo {
  const lotes = row.lotes_insumos ?? [];
  const stockActualTotal = lotes.reduce((acc, curr) => acc + curr.stock_actual, 0);

  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    stockMinimo: row.stock_minimo,
    createdAt: toTimestampLike(row.created_at),
    updatedAt: toTimestampLike(row.updated_at),
    stockActualTotal
  };
}

function mapLoteRow(row: DbLoteInsumo & { insumos?: DbInsumo }): LoteInsumo {
  return {
    id: row.id,
    insumoId: row.insumo_id,
    numeroLote: row.numero_lote,
    numeroSerie: row.numero_serie ?? undefined,
    fechaVencimiento: row.fecha_vencimiento,
    stockActual: row.stock_actual,
    createdAt: toTimestampLike(row.created_at),
    updatedAt: toTimestampLike(row.updated_at),
    insumo: row.insumos ? mapInsumoRow(row.insumos) : undefined
  };
}

// 1. Obtener todos los insumos (consolidados)
export async function getInsumos(): Promise<Insumo[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("insumos")
    .select("*, lotes_insumos(*)")
    .order("nombre");
  
  assertNoError(error, "Error al obtener los insumos.");
  return (data as any[] ?? []).map(mapInsumoRow);
}

// 2. Obtener lotes para un insumo específico
export async function getLotesByInsumo(insumoId: string): Promise<LoteInsumo[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("lotes_insumos")
    .select("*, insumos(*)")
    .eq("insumo_id", insumoId)
    .order("fecha_vencimiento", { ascending: true });

  assertNoError(error, "Error al obtener los lotes.");
  return (data as any[] ?? []).map(mapLoteRow);
}

// 3. Crear un nuevo Insumo
export async function createInsumo(data: {
  id?: string;
  nombre: string;
  categoria: string;
  stockMinimo: number;
}): Promise<string> {
  const supabase = getSupabaseClient();
  const insertData: any = {
    nombre: data.nombre.trim(),
    categoria: data.categoria.trim(),
    stock_minimo: data.stockMinimo
  };
  if (data.id && data.id.trim()) {
    insertData.id = data.id.trim();
  }
  const { data: row, error } = await supabase
    .from("insumos")
    .insert(insertData)
    .select("id")
    .single();

  assertNoError(error, "Error al crear el insumo.");
  return (row as { id: string }).id;
}

// 4. Registrar Ingreso (Upsert Lote + Movimiento Ingreso)
export async function registrarIngresoStock(
  insumoId: string,
  data: {
    cantidad: number;
    numeroLote: string;
    numeroSerie?: string;
    fechaVencimiento: string;
  }
): Promise<void> {
  const supabase = getSupabaseClient();
  
  if (data.cantidad <= 0) {
    throw new Error("La cantidad a ingresar debe ser mayor que cero.");
  }

  // Buscar si ya existe un lote para este insumo con el mismo número de lote y número de serie
  let query = supabase
    .from("lotes_insumos")
    .select("*")
    .eq("insumo_id", insumoId)
    .eq("numero_lote", data.numeroLote.trim());

  if (data.numeroSerie && data.numeroSerie.trim()) {
    query = query.eq("numero_serie", data.numeroSerie.trim());
  } else {
    query = query.is("numero_serie", null);
  }

  const { data: existingLots, error: selectError } = await query;
  assertNoError(selectError, "Error al buscar lote existente.");

  let lotId: string;
  if (existingLots && existingLots.length > 0) {
    // Incrementar stock del lote existente
    const existingLote = existingLots[0];
    lotId = existingLote.id;
    const { error: updateError } = await supabase
      .from("lotes_insumos")
      .update({
        stock_actual: existingLote.stock_actual + data.cantidad,
        fecha_vencimiento: data.fechaVencimiento // actualiza la fecha por si acaso
      })
      .eq("id", lotId);
    assertNoError(updateError, "Error al actualizar stock del lote.");
  } else {
    // Crear nuevo lote
    const { data: newLot, error: insertError } = await supabase
      .from("lotes_insumos")
      .insert({
        insumo_id: insumoId,
        numero_lote: data.numeroLote.trim(),
        numero_serie: data.numeroSerie?.trim() || null,
        fecha_vencimiento: data.fechaVencimiento,
        stock_actual: data.cantidad
      })
      .select("id")
      .single();
    assertNoError(insertError, "Error al crear lote nuevo.");
    lotId = (newLot as { id: string }).id;
  }

  // Crear el movimiento de stock de ingreso
  const { error: movementError } = await supabase
    .from("movimientos_stock")
    .insert({
      insumo_id: insumoId,
      lote_id: lotId,
      tipo: "INGRESO",
      cantidad: data.cantidad
    });
  assertNoError(movementError, "Error al registrar movimiento de stock.");
}

// 5. Registrar Egreso (Lógica FEFO: First Expired, First Out)
export async function registrarEgresoStock(
  insumoId: string,
  data: {
    cantidad: number;
    servicioDestino: string;
    pacienteId?: string;
    profesionalId?: string;
  }
): Promise<void> {
  const supabase = getSupabaseClient();

  if (data.cantidad <= 0) {
    throw new Error("La cantidad a egresar debe ser mayor que cero.");
  }

  // Buscar insumo para saber su categoría
  const { data: insumoRow, error: insumoError } = await supabase
    .from("insumos")
    .select("*")
    .eq("id", insumoId)
    .single();
  assertNoError(insumoError, "Error al buscar el insumo.");
  const insumo = insumoRow as DbInsumo;

  const esImplanteOBiomaterial =
    insumo.categoria.toLowerCase() === "implantes" ||
    insumo.categoria.toLowerCase() === "biomateriales";

  if (esImplanteOBiomaterial) {
    if (!data.pacienteId) {
      throw new Error("El Paciente es obligatorio para insumos de categoría Implantes/Biomateriales.");
    }
    if (!data.profesionalId) {
      throw new Error("El Profesional es obligatorio para insumos de categoría Implantes/Biomateriales.");
    }
  }

  // Obtener lotes activos no vencidos y con stock, ordenados por fecha_vencimiento ASC (FEFO)
  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const { data: activeLotsRow, error: lotsError } = await supabase
    .from("lotes_insumos")
    .select("*")
    .eq("insumo_id", insumoId)
    .gt("fecha_vencimiento", todayStr)
    .gt("stock_actual", 0)
    .order("fecha_vencimiento", { ascending: true });
  assertNoError(lotsError, "Error al buscar lotes activos para FEFO.");

  const activeLots = activeLotsRow as DbLoteInsumo[];
  const stockConsolidado = activeLots.reduce((acc, curr) => acc + curr.stock_actual, 0);

  if (stockConsolidado < data.cantidad) {
    throw new Error(
      `Stock insuficiente para FEFO. Requerido: ${data.cantidad}, Disponible (no vencido): ${stockConsolidado}`
    );
  }

  let cantidadRestante = data.cantidad;

  // Descontar stock lote por lote usando FEFO
  for (const lote of activeLots) {
    if (cantidadRestante <= 0) break;

    const cantidadADescontar = Math.min(lote.stock_actual, cantidadRestante);
    const nuevoStock = lote.stock_actual - cantidadADescontar;

    // 1. Actualizar stock del lote
    const { error: updateError } = await supabase
      .from("lotes_insumos")
      .update({ stock_actual: nuevoStock })
      .eq("id", lote.id);
    assertNoError(updateError, "Error al actualizar lote en egreso.");

    // 2. Registrar el movimiento de egreso
    const { data: movementRow, error: moveError } = await supabase
      .from("movimientos_stock")
      .insert({
        insumo_id: insumoId,
        lote_id: lote.id,
        tipo: "EGRESO",
        cantidad: cantidadADescontar,
        servicio_destino: data.servicioDestino,
        paciente_id: data.pacienteId || null,
        profesional_id: data.profesionalId || null
      })
      .select("id")
      .single();
    assertNoError(moveError, "Error al registrar movimiento de egreso.");
    const movementId = (movementRow as { id: string }).id;

    // 3. Registrar trazabilidad si es Implante o Biomaterial
    if (esImplanteOBiomaterial) {
      const { error: tracError } = await supabase
        .from("trazabilidad_cirugia")
        .insert({
          movimiento_id: movementId,
          paciente_id: data.pacienteId!,
          profesional_id: data.profesionalId!,
          insumo_id: insumoId,
          numero_serie: lote.numero_serie || "S/N"
        });
      assertNoError(tracError, "Error al registrar la trazabilidad de cirugía.");
    }

    cantidadRestante -= cantidadADescontar;
  }
}

// 6. Obtener historial de movimientos de egreso para el planificador
export async function getMovimientosStockHistory(days: number): Promise<MovimientoStock[]> {
  const supabase = getSupabaseClient();
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  const limitIso = dateLimit.toISOString();

  const { data, error } = await supabase
    .from("movimientos_stock")
    .select("*, insumos(*)")
    .eq("tipo", "EGRESO")
    .gte("created_at", limitIso)
    .order("created_at", { ascending: false });

  assertNoError(error, "Error al obtener historial de movimientos.");
  
  return (data as any[] ?? []).map((row) => ({
    id: row.id,
    insumoId: row.insumo_id,
    loteId: row.lote_id,
    tipo: row.tipo,
    cantidad: row.cantidad,
    servicioDestino: row.servicio_destino ?? undefined,
    pacienteId: row.paciente_id ?? undefined,
    profesionalId: row.profesional_id ?? undefined,
    createdAt: toTimestampLike(row.created_at),
    insumo: row.insumos ? mapInsumoRow(row.insumos) : undefined
  }));
}
