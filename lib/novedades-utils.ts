import Fuse from "fuse.js";
import type { Novedad } from "@/types";

export function formatCategoriaNombre(nombre: string | undefined): string {
  if (!nombre) return "Sin categoría";
  const upper = nombre.toUpperCase().trim();
  const standard: Record<string, string> = {
    EXPEDIENTE: "Expediente",
    DESPERFECTO: "Desperfecto",
    LIMPIEZA: "Limpieza",
    REPARACION: "Reparación",
    RECORDATORIO: "Recordatorio",
    INSUMOS: "Insumos",
    OTRO: "Otro"
  };
  if (standard[upper]) return standard[upper];

  // Capitaliza el resto de las palabras personalizadas de forma elegante
  return nombre
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type NovedadSearchable = {
  id: string;
  titulo: string;
  descripcion: string;
  expedienteNumero: string;
  consultorioBox: string;
  categoria: string;
  creadoPor: string;
  completadoPor: string;
};

function toSearchable(n: Novedad): NovedadSearchable {
  return {
    id: n.id,
    titulo: n.titulo,
    descripcion: n.descripcion ?? "",
    expedienteNumero: n.expedienteNumero ?? "",
    consultorioBox: n.consultorioBox ?? "",
    categoria: n.categoria ? formatCategoriaNombre(n.categoria.nombre) : "Sin categoría",
    creadoPor: n.creadoPor.nombre,
    completadoPor: n.completadoPor?.nombre ?? ""
  };
}

export function sortNovedades(items: Novedad[]): Novedad[] {
  const pendientes = items
    .filter((n) => n.estado === "PENDIENTE")
    .sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());

  const completados = items
    .filter((n) => n.estado === "COMPLETADO")
    .sort((a, b) => {
      const dateA = new Date(a.fechaCompletado ?? a.fechaCreacion).getTime();
      const dateB = new Date(b.fechaCompletado ?? b.fechaCreacion).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
    });

  return [...pendientes, ...completados];
}

export function filterNovedadesByDateRange(
  items: Novedad[],
  fechaInicio?: string,
  fechaFin?: string
): Novedad[] {
  if (!fechaInicio && !fechaFin) return items;

  const start = fechaInicio ? new Date(`${fechaInicio}T00:00:00`).getTime() : null;
  const end = fechaFin ? new Date(`${fechaFin}T23:59:59.999`).getTime() : null;

  return items.filter((n) => {
    const ts = new Date(n.fechaCreacion).getTime();
    if (start !== null && ts < start) return false;
    if (end !== null && ts > end) return false;
    return true;
  });
}

export function fuzzySearchNovedades(items: Novedad[], query: string): Novedad[] {
  const trimmed = query.trim();
  if (!trimmed) return items;

  const fuse = new Fuse(items.map(toSearchable), {
    keys: [
      "titulo",
      "descripcion",
      "expedienteNumero",
      "consultorioBox",
      "categoria",
      "creadoPor",
      "completadoPor"
    ],
    threshold: 0.4,
    ignoreLocation: true
  });

  const ids = new Set(fuse.search(trimmed).map((r) => r.item.id));
  return items.filter((n) => ids.has(n.id));
}

export function formatDateTimeEsAr(iso: string | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
