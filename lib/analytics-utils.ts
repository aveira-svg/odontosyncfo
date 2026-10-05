import type { AppTimestamp, Facturacion, Paciente, PracticaClinica } from "@/types";

export type Granularity = "dia" | "mes" | "trimestre" | "semestre" | "anio";

export const GRANULARITY_OPTIONS: { id: Granularity; label: string }[] = [
  { id: "dia", label: "Día" },
  { id: "mes", label: "Mes" },
  { id: "trimestre", label: "Trimestre" },
  { id: "semestre", label: "Semestre" },
  { id: "anio", label: "Año" }
];

export type AgeGroup = "<12" | "12-18" | "19-35" | "36-60" | ">60" | "desconocido";

export const AGE_GROUP_CONFIG: { id: AgeGroup; label: string; min?: number; max?: number }[] = [
  { id: "<12", label: "< 12 años (Infantil / Pediatría)", max: 11 },
  { id: "12-18", label: "12 a 18 años (Adolescentes)", min: 12, max: 18 },
  { id: "19-35", label: "19 a 35 años (Adultos Jóvenes)", min: 19, max: 35 },
  { id: "36-60", label: "36 a 60 años (Adultos)", min: 36, max: 60 },
  { id: ">60", label: "> 60 años (Adultos Mayores / Gerontología)", min: 61 },
  { id: "desconocido", label: "Sin registrar fecha de nacimiento" }
];

export type ProcedenciaCategory =
  | "corrientes_capital"
  | "resistencia"
  | "interior_corrientes"
  | "interior_chaco"
  | "otras_provincias"
  | "sin_especificar";

export const PROCEDENCIA_CONFIG: { id: ProcedenciaCategory; label: string }[] = [
  { id: "corrientes_capital", label: "Corrientes (Capital)" },
  { id: "resistencia", label: "Resistencia (Gran Resistencia - Chaco)" },
  { id: "interior_corrientes", label: "Interior de Corrientes" },
  { id: "interior_chaco", label: "Interior del Chaco" },
  { id: "otras_provincias", label: "Otras Provincias / Región NEA" },
  { id: "sin_especificar", label: "Sin especificar / No registrado" }
];

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

/**
 * Retorna las claves de agrupación y etiqueta legible según la granularidad temporal seleccionada.
 */
export function getPeriodData(
  date: Date,
  granularity: Granularity
): { key: string; label: string; sortKey: string } {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0 - 11
  const d = date.getDate();

  const pad = (n: number) => String(n).padStart(2, "0");

  switch (granularity) {
    case "dia": {
      const sortKey = `${y}-${pad(m + 1)}-${pad(d)}`;
      const label = `${pad(d)}/${pad(m + 1)}/${y}`;
      return { key: sortKey, label, sortKey };
    }
    case "mes": {
      const sortKey = `${y}-${pad(m + 1)}`;
      const label = `${MESES[m]} ${y}`;
      return { key: sortKey, label, sortKey };
    }
    case "trimestre": {
      const q = Math.floor(m / 3) + 1;
      const sortKey = `${y}-T${q}`;
      const label = `${q}° Trimestre ${y}`;
      return { key: sortKey, label, sortKey };
    }
    case "semestre": {
      const s = m < 6 ? 1 : 2;
      const sortKey = `${y}-S${s}`;
      const label = `${s}° Semestre ${y}`;
      return { key: sortKey, label, sortKey };
    }
    case "anio": {
      const sortKey = String(y);
      const label = String(y);
      return { key: sortKey, label, sortKey };
    }
  }
}

/**
 * Calcula la edad a partir de una fecha de nacimiento (ISO, YYYY-MM-DD o AppTimestamp).
 */
export function calculateAge(fechaNacimiento: string | AppTimestamp | undefined): number | null {
  if (!fechaNacimiento) return null;
  let birthDate: Date;
  if (typeof fechaNacimiento === "object" && "toDate" in fechaNacimiento) {
    birthDate = fechaNacimiento.toDate();
  } else {
    // Si viene en formato YYYY-MM-DD
    const parts = String(fechaNacimiento).split("-");
    if (parts.length === 3) {
      birthDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      birthDate = new Date(fechaNacimiento);
    }
  }

  if (isNaN(birthDate.getTime()) || birthDate.getFullYear() < 1900) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 && age < 130 ? age : null;
}

/**
 * Clasifica una edad en un grupo etario estándar.
 */
export function getAgeGroup(age: number | null): AgeGroup {
  if (age === null) return "desconocido";
  if (age < 12) return "<12";
  if (age <= 18) return "12-18";
  if (age <= 35) return "19-35";
  if (age <= 60) return "36-60";
  return ">60";
}

export function getAgeGroupLabel(group: AgeGroup): string {
  const found = AGE_GROUP_CONFIG.find((c) => c.id === group);
  return found?.label ?? "Desconocido";
}

/**
 * Clasifica la procedencia de un paciente según su dirección registrada.
 */
export function classifyProcedencia(direccion?: string): ProcedenciaCategory {
  if (!direccion || !direccion.trim()) return "sin_especificar";
  const str = direccion.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Corrientes Capital
  if (
    str.includes("corrientes") &&
    (str.includes("capital") || str.includes("ctes") || str.includes("centro") || !str.includes("interior"))
  ) {
    return "corrientes_capital";
  }
  if (
    str.includes("barrio") ||
    str.includes("av.") ||
    str.includes("calle") ||
    str.includes("1000 viv") ||
    str.includes("laguna seca") ||
    str.includes("san jeronimo") ||
    str.includes("beron de astrada") ||
    str.includes("cambe cure") ||
    str.includes("aldana") ||
    str.includes("san martin")
  ) {
    if (!str.includes("chaco") && !str.includes("resistencia")) {
      return "corrientes_capital";
    }
  }

  // Resistencia / Gran Resistencia
  if (
    str.includes("resistencia") ||
    str.includes("barranqueras") ||
    str.includes("fontana") ||
    str.includes("vilelas") ||
    (str.includes("chaco") && !str.includes("interior"))
  ) {
    return "resistencia";
  }

  // Interior de Corrientes
  if (
    str.includes("goya") ||
    str.includes("paso de los libres") ||
    str.includes("curuzu") ||
    str.includes("mercedes") ||
    str.includes("bella vista") ||
    str.includes("ituzaingo") ||
    str.includes("santo tome") ||
    str.includes("esquina") ||
    str.includes("monte caseros") ||
    str.includes("saladas") ||
    str.includes("santa ana") ||
    str.includes("san cosme") ||
    str.includes("itata") ||
    str.includes("itatai") ||
    str.includes("empedrado") ||
    str.includes("virasoro") ||
    str.includes("interior corrientes")
  ) {
    return "interior_corrientes";
  }

  // Interior del Chaco
  if (
    str.includes("saenz pena") ||
    str.includes("villa angela") ||
    str.includes("charata") ||
    str.includes("castelli") ||
    str.includes("san martin chaco") ||
    str.includes("machagai") ||
    str.includes("quitilipi") ||
    str.includes("las brenas") ||
    str.includes("interior chaco")
  ) {
    return "interior_chaco";
  }

  // Otras provincias
  if (
    str.includes("misiones") ||
    str.includes("posadas") ||
    str.includes("formosa") ||
    str.includes("santa fe") ||
    str.includes("buenos aires") ||
    str.includes("cordoba") ||
    str.includes("entre rios")
  ) {
    return "otras_provincias";
  }

  return "corrientes_capital"; // Por defecto regional
}

export function getProcedenciaLabel(cat: ProcedenciaCategory): string {
  const found = PROCEDENCIA_CONFIG.find((c) => c.id === cat);
  return found?.label ?? "Sin especificar";
}

/**
 * Determina si una práctica debe ser excluida de las estadísticas analíticas.
 * Excluye registros que representan un mero registro de asistencia (ej: "PACIENTE ATENDIDO").
 */
export function isPracticaExcluida(practica: string | null | undefined): boolean {
  if (!practica) return false;
  const normalized = practica
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  return normalized === "paciente atendido";
}

// --- Tipos de Agrupación de Tablas ---

export interface BillingGroupRow {
  groupKey: string;
  periodKey: string;
  periodLabel: string;
  periodSortKey: string;
  servicio: string;
  profesionalId?: string;
  profesionalNombre?: string;
  practicaCobrada: string;
  cantidadPracticas: number;
  recaudadoTotal: number;
  costoTotal: number;
  saldoPendiente: number;
}

export interface ClinicalGroupRow {
  groupKey: string;
  periodKey: string;
  periodLabel: string;
  periodSortKey: string;
  servicio: string;
  odontologo?: string;
  practicaRealizada: string;
  totalAtenciones: number;
}

/**
 * Agrupa las facturaciones según [Período + Servicio + (Profesional opcional) + Práctica cobrada].
 */
export function aggregateBillingData(
  invoices: Facturacion[],
  granularity: Granularity,
  mostrarProfesional: boolean,
  profesionalMap: Record<string, string>
): BillingGroupRow[] {
  const groups: Record<string, BillingGroupRow> = {};

  invoices.forEach((inv) => {
    if (isPracticaExcluida(inv.practicaCobradaDetalle)) return;
    const date = inv.fecha.toDate();
    const period = getPeriodData(date, granularity);
    const servicio = inv.servicioAsociado || "General";
    const profId = inv.profesionalId || "";
    const profNombre = profesionalMap[profId] || profId || "Sin profesional";
    const practica = inv.practicaCobradaDetalle || "Práctica odontológica";

    const groupKey = `${period.key}:::${servicio}:::${mostrarProfesional ? profId : "ALL"}:::${practica}`;

    if (!groups[groupKey]) {
      groups[groupKey] = {
        groupKey,
        periodKey: period.key,
        periodLabel: period.label,
        periodSortKey: period.sortKey,
        servicio,
        profesionalId: mostrarProfesional ? profId : undefined,
        profesionalNombre: mostrarProfesional ? profNombre : undefined,
        practicaCobrada: practica,
        cantidadPracticas: 0,
        recaudadoTotal: 0,
        costoTotal: 0,
        saldoPendiente: 0
      };
    }

    groups[groupKey].cantidadPracticas += 1;
    groups[groupKey].recaudadoTotal += inv.montoAbonado || 0;
    groups[groupKey].costoTotal += inv.costoTotal || 0;
    groups[groupKey].saldoPendiente += inv.saldoPendiente || 0;
  });

  return Object.values(groups).sort((a, b) => {
    const diff = a.periodSortKey.localeCompare(b.periodSortKey);
    if (diff !== 0) return diff;
    const servDiff = a.servicio.localeCompare(b.servicio);
    if (servDiff !== 0) return servDiff;
    if (mostrarProfesional && a.profesionalNombre && b.profesionalNombre) {
      const profDiff = a.profesionalNombre.localeCompare(b.profesionalNombre);
      if (profDiff !== 0) return profDiff;
    }
    return a.practicaCobrada.localeCompare(b.practicaCobrada);
  });
}

/**
 * Agrupa las atenciones clínicas según [Período + Servicio + (Odontólogo opcional) + Práctica realizada].
 */
export function aggregateClinicalData(
  practicas: PracticaClinica[],
  granularity: Granularity,
  mostrarProfesional: boolean
): ClinicalGroupRow[] {
  const groups: Record<string, ClinicalGroupRow> = {};

  practicas.forEach((p) => {
    if (isPracticaExcluida(p.practicaRealizada)) return;
    const date = p.fechaAtencion.toDate();
    const period = getPeriodData(date, granularity);
    const servicio = p.servicio || "General";
    const odontologo = p.odontologoResponsable || "Sin odontólogo";
    const practica = p.practicaRealizada || "Atención odontológica";

    const groupKey = `${period.key}:::${servicio}:::${mostrarProfesional ? odontologo : "ALL"}:::${practica}`;

    if (!groups[groupKey]) {
      groups[groupKey] = {
        groupKey,
        periodKey: period.key,
        periodLabel: period.label,
        periodSortKey: period.sortKey,
        servicio,
        odontologo: mostrarProfesional ? odontologo : undefined,
        practicaRealizada: practica,
        totalAtenciones: 0
      };
    }

    groups[groupKey].totalAtenciones += 1;
  });

  return Object.values(groups).sort((a, b) => {
    const diff = a.periodSortKey.localeCompare(b.periodSortKey);
    if (diff !== 0) return diff;
    const servDiff = a.servicio.localeCompare(b.servicio);
    if (servDiff !== 0) return servDiff;
    if (mostrarProfesional && a.odontologo && b.odontologo) {
      const profDiff = a.odontologo.localeCompare(b.odontologo);
      if (profDiff !== 0) return profDiff;
    }
    return a.practicaRealizada.localeCompare(b.practicaRealizada);
  });
}
