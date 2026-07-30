"use client";

import type { User } from "@supabase/supabase-js";
import { toNovedadUsuario } from "@/lib/auth-utils";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { DbNovedad, DbCategoriaNovedad, DbNovedadActualizacion } from "@/lib/supabase/database.types";
import { toBsAsIsoString } from "@/lib/date-utils";
import type {
  CompletarNovedadInput,
  CreateNovedadInput,
  Novedad,
  CategoriaNovedad,
  NovedadActualizacion
} from "@/types";

function assertNoError(error: { message: string; code?: string } | null, fallback: string): void {
  if (error) {
    throw new Error(error.message || fallback);
  }
}

function mapNovedadRow(row: DbNovedad & { categoria?: DbCategoriaNovedad | null }): Novedad {
  return {
    id: row.id,
    titulo: row.titulo,
    categoriaId: row.categoria_id,
    categoria: row.categoria
      ? {
          id: row.categoria.id,
          nombre: row.categoria.nombre,
          requiereExpediente: row.categoria.requiere_expediente,
          requiereConsultorio: row.categoria.requiere_consultorio
        }
      : {
          id: row.categoria_id,
          nombre: row.categoria || "Sin categoría",
          requiereExpediente: false,
          requiereConsultorio: false
        },
    estado: row.estado,
    fechaCreacion: row.fecha_creacion,
    fechaCompletado: row.fecha_completado ?? undefined,
    expedienteNumero: row.expediente_numero ?? undefined,
    expedienteFecha: row.expediente_fecha ?? undefined,
    consultorioBox: row.consultorio_box ?? undefined,
    descripcion: row.descripcion ?? undefined,
    creadoPor: {
      id: row.creado_por_id,
      nombre: row.creado_por_nombre
    },
    completadoPor:
      row.completado_por_id && row.completado_por_nombre
        ? { id: row.completado_por_id, nombre: row.completado_por_nombre }
        : undefined,
    notasCierre: row.notas_cierre ?? undefined
  };
}

export async function getNovedades(): Promise<Novedad[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("novedades")
    .select("*, categoria:categorias_novedades(*)")
    .order("fecha_creacion", { ascending: false });

  assertNoError(error, "Error al cargar las novedades.");
  return (data as (DbNovedad & { categoria: DbCategoriaNovedad })[] ?? []).map(mapNovedadRow);
}

export async function createNovedad(
  input: CreateNovedadInput,
  user: User
): Promise<Novedad> {
  const usuario = toNovedadUsuario(user);
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();

  // Obtener detalles de la categoría para guardar el nombre de fallback en la columna 'categoria'
  const { data: catData, error: catError } = await supabase
    .from("categorias_novedades")
    .select("*")
    .eq("id", input.categoriaId)
    .single();

  assertNoError(catError, "La categoría seleccionada no existe.");
  const categoriaDb = catData as DbCategoriaNovedad;

  const { data, error } = await supabase
    .from("novedades")
    .insert({
      titulo: input.titulo.trim(),
      categoria: categoriaDb.nombre, // Compatibilidad con columna de texto existente
      categoria_id: input.categoriaId,
      estado: "PENDIENTE",
      fecha_creacion: now,
      descripcion: input.descripcion?.trim() || null,
      expediente_numero: input.expedienteNumero?.trim() || null,
      expediente_fecha: input.expedienteFecha?.trim() || null,
      consultorio_box: input.consultorioBox?.trim() || null,
      creado_por_id: usuario.id,
      creado_por_nombre: usuario.nombre
    })
    .select("*, categoria:categorias_novedades(*)")
    .single();

  assertNoError(error, "Error al registrar la novedad.");
  return mapNovedadRow(data as DbNovedad & { categoria: DbCategoriaNovedad });
}

export async function completarNovedad(
  input: CompletarNovedadInput,
  user: User
): Promise<Novedad> {
  const usuario = toNovedadUsuario(user);
  const now = new Date().toISOString();

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("novedades")
    .update({
      estado: "COMPLETADO",
      fecha_completado: now,
      completado_por_id: usuario.id,
      completado_por_nombre: usuario.nombre,
      notas_cierre: input.notasCierre?.trim() || null
    })
    .eq("id", input.id)
    .eq("estado", "PENDIENTE")
    .select("*, categoria:categorias_novedades(*)")
    .single();

  assertNoError(error, "Error al completar la novedad.");
  return mapNovedadRow(data as DbNovedad & { categoria: DbCategoriaNovedad });
}

// --- Servicios de Categorías Dinámicas ---

export async function getCategorias(): Promise<CategoriaNovedad[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("categorias_novedades")
    .select("*")
    .order("nombre", { ascending: true });

  assertNoError(error, "Error al cargar las categorías.");
  return (data as DbCategoriaNovedad[] ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    requiereExpediente: row.requiere_expediente,
    requiereConsultorio: row.requiere_consultorio
  }));
}

export async function createCategoria(
  nombre: string,
  requiereExpediente: boolean,
  requiereConsultorio: boolean
): Promise<CategoriaNovedad> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("categorias_novedades")
    .insert({
      nombre: nombre.trim().toUpperCase(),
      requiere_expediente: requiereExpediente,
      requiere_consultorio: requiereConsultorio
    })
    .select("*")
    .single();

  assertNoError(error, "Error al crear la categoría.");
  const row = data as DbCategoriaNovedad;
  return {
    id: row.id,
    nombre: row.nombre,
    requiereExpediente: row.requiere_expediente,
    requiereConsultorio: row.requiere_consultorio
  };
}

export async function deleteCategoria(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("categorias_novedades")
    .delete()
    .eq("id", id);

  assertNoError(error, "Error al eliminar la categoría.");
}

export function validateCreateNovedadInput(
  input: CreateNovedadInput,
  categoria?: CategoriaNovedad
): string | null {
  if (!input.titulo.trim()) return "Ingresá un título para la novedad.";
  if (!input.categoriaId) return "Seleccioná una categoría.";

  if (categoria) {
    if (categoria.requiereExpediente) {
      if (!input.expedienteNumero?.trim()) return "Ingresá el número de expediente.";
      if (!input.expedienteFecha?.trim()) return "Ingresá la fecha del expediente.";
    }
    if (categoria.requiereConsultorio) {
      if (!input.consultorioBox?.trim()) return "Ingresá el consultorio o box.";
    }
  }
  return null;
}

export async function getActualizaciones(novedadId: string): Promise<NovedadActualizacion[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("novedad_actualizaciones")
    .select("*")
    .eq("novedad_id", novedadId)
    .order("fecha_creacion", { ascending: true });

  assertNoError(error, "Error al cargar las actualizaciones.");
  return (data as DbNovedadActualizacion[] ?? []).map((row) => ({
    id: row.id,
    novedadId: row.novedad_id,
    nota: row.nota,
    creadoPor: {
      id: row.creado_por_id,
      nombre: row.creado_por_nombre
    },
    fechaCreacion: row.fecha_creacion
  }));
}

export async function createActualizacion(
  novedadId: string,
  nota: string,
  user: User
): Promise<NovedadActualizacion> {
  const usuario = toNovedadUsuario(user);
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("novedad_actualizaciones")
    .insert({
      novedad_id: novedadId,
      nota: nota.trim(),
      creado_por_id: usuario.id,
      creado_por_nombre: usuario.nombre,
      fecha_creacion: now
    })
    .select("*")
    .single();

  assertNoError(error, "Error al registrar la actualización.");
  const row = data as DbNovedadActualizacion;
  return {
    id: row.id,
    novedadId: row.novedad_id,
    nota: row.nota,
    creadoPor: {
      id: row.creado_por_id,
      nombre: row.creado_por_nombre
    },
    fechaCreacion: row.fecha_creacion
  };
}

export { toBsAsIsoString };
