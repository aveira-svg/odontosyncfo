"use client";

import { CheckCircle2, Clock } from "lucide-react";
import type { Novedad } from "@/types";
import {
  formatCategoriaNombre,
  formatDateTimeEsAr
} from "@/lib/novedades-utils";
import { formatDateEsAr } from "@/lib/date-utils";

type NovedadesTableProps = {
  items: Novedad[];
  onCompletar: (novedad: Novedad) => void;
  onVerActualizaciones: (novedad: Novedad) => void;
  loading?: boolean;
};

export function getCategoriaBadgeClass(nombre: string | undefined): string {
  if (!nombre) return "bg-slate-100 text-slate-700 border border-slate-200";
  const upper = nombre.toUpperCase().trim();
  if (upper.includes("EXPEDIENTE")) return "bg-indigo-50 text-indigo-800 border border-indigo-200/50";
  if (upper.includes("DESPERFECTO")) return "bg-rose-50 text-rose-800 border border-rose-200/50";
  if (upper.includes("LIMPIEZA")) return "bg-sky-50 text-sky-800 border border-sky-200/50";
  if (upper.includes("REPARACION") || upper.includes("REPARACIÓN")) return "bg-amber-50 text-amber-800 border border-amber-200/50";
  if (upper.includes("RECORDATORIO")) return "bg-violet-50 text-violet-800 border border-violet-200/50";
  if (upper.includes("INSUMOS")) return "bg-emerald-50 text-emerald-800 border border-emerald-200/50";

  const colors = [
    "bg-teal-50 text-teal-800 border border-teal-200/50",
    "bg-orange-50 text-orange-800 border border-orange-200/50",
    "bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200/50",
    "bg-cyan-50 text-cyan-800 border border-cyan-200/50"
  ];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

function NovedadRow({
  novedad,
  onCompletar,
  onVerActualizaciones
}: {
  novedad: Novedad;
  onCompletar: (n: Novedad) => void;
  onVerActualizaciones: (n: Novedad) => void;
}) {
  const isPendiente = novedad.estado === "PENDIENTE";

  return (
    <tr className={isPendiente ? "bg-amber-50/40" : "opacity-90"}>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-col gap-1">
          <span className="font-semibold text-slate-900">{novedad.titulo}</span>
          {novedad.descripcion && (
            <span className="text-xs text-slate-600 line-clamp-2">{novedad.descripcion}</span>
          )}
          <button
            type="button"
            onClick={() => onVerActualizaciones(novedad)}
            className="mt-1.5 inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/50 px-2 py-0.5 rounded-lg w-max transition-colors"
          >
            💬 Historial / Actualizaciones
          </button>
          {novedad.notasCierre && !isPendiente && (
            <span className="text-xs italic text-slate-500">
              Cierre: {novedad.notasCierre}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${getCategoriaBadgeClass(novedad.categoria?.nombre)}`}
        >
          {formatCategoriaNombre(novedad.categoria?.nombre)}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-xs text-slate-600">
        {novedad.expedienteNumero && (
          <p>
            <span className="font-semibold text-slate-700">Exp:</span> {novedad.expedienteNumero}
            {novedad.expedienteFecha && (
              <span className="text-slate-500"> ({formatDateEsAr(novedad.expedienteFecha)})</span>
            )}
          </p>
        )}
        {novedad.consultorioBox && (
          <p>
            <span className="font-semibold text-slate-700">Box:</span> {novedad.consultorioBox}
          </p>
        )}
        {!novedad.expedienteNumero && !novedad.consultorioBox && (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 align-top text-xs text-slate-600">
        <p>{formatDateTimeEsAr(novedad.fechaCreacion)}</p>
        {!isPendiente && novedad.fechaCompletado && (
          <p className="mt-1 text-emerald-700">
            Completado: {formatDateTimeEsAr(novedad.fechaCompletado)}
          </p>
        )}
      </td>
      <td className="px-4 py-3 align-top text-xs">
        <p className="text-slate-700">
          <span className="font-semibold">Creado por:</span> {novedad.creadoPor.nombre}
        </p>
        {novedad.completadoPor && (
          <p className="mt-1 text-emerald-700">
            <span className="font-semibold">Resuelto por:</span> {novedad.completadoPor.nombre}
          </p>
        )}
      </td>
      <td className="px-4 py-3 align-top text-right">
        {isPendiente ? (
          <button
            type="button"
            onClick={() => onCompletar(novedad)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm transition-all hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Marcar Visto / Completado
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            Completado
          </span>
        )}
      </td>
    </tr>
  );
}

function SectionHeader({
  title,
  count,
  variant
}: {
  title: string;
  count: number;
  variant: "pendiente" | "completado";
}) {
  const styles =
    variant === "pendiente"
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <tr>
      <td colSpan={6} className={`border-y px-4 py-2 ${styles}`}>
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide">
          {variant === "pendiente" ? (
            <Clock className="h-4 w-4" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          )}
          {title}
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px]">{count}</span>
        </div>
      </td>
    </tr>
  );
}

export function NovedadesTable({ items, onCompletar, onVerActualizaciones, loading }: NovedadesTableProps) {
  const pendientes = items.filter((n) => n.estado === "PENDIENTE");
  const completados = items.filter((n) => n.estado === "COMPLETADO");

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card py-16 text-center">
        <p className="text-sm font-semibold text-slate-600">No hay novedades para mostrar.</p>
        <p className="mt-1 text-xs text-slate-400">
          Registrá una nueva novedad o ajustá los filtros de búsqueda.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-4 py-3">Título / Detalle</th>
              <th scope="col" className="px-4 py-3">Categoría</th>
              <th scope="col" className="px-4 py-3">Referencia</th>
              <th scope="col" className="px-4 py-3">Fechas</th>
              <th scope="col" className="px-4 py-3">Responsables</th>
              <th scope="col" className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pendientes.length > 0 && (
              <>
                <SectionHeader title="Pendientes" count={pendientes.length} variant="pendiente" />
                {pendientes.map((n) => (
                  <NovedadRow
                    key={n.id}
                    novedad={n}
                    onCompletar={onCompletar}
                    onVerActualizaciones={onVerActualizaciones}
                  />
                ))}
              </>
            )}
            {completados.length > 0 && (
              <>
                <SectionHeader title="Completados" count={completados.length} variant="completado" />
                {completados.map((n) => (
                  <NovedadRow
                    key={n.id}
                    novedad={n}
                    onCompletar={onCompletar}
                    onVerActualizaciones={onVerActualizaciones}
                  />
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
