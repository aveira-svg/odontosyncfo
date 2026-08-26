"use client";

import { useState } from "react";
import { CheckCircle2, Clock, MessageSquare, ChevronDown, ChevronUp, FileText, MapPin, User, Calendar } from "lucide-react";
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
  if (upper.includes("EXPEDIENTE")) return "bg-indigo-50 text-indigo-800 border border-indigo-200/60";
  if (upper.includes("DESPERFECTO")) return "bg-rose-50 text-rose-800 border border-rose-200/60";
  if (upper.includes("LIMPIEZA")) return "bg-sky-50 text-sky-800 border border-sky-200/60";
  if (upper.includes("REPARACION") || upper.includes("REPARACIÓN")) return "bg-amber-50 text-amber-800 border border-amber-200/60";
  if (upper.includes("RECORDATORIO")) return "bg-violet-50 text-violet-800 border border-violet-200/60";
  if (upper.includes("INSUMOS")) return "bg-emerald-50 text-emerald-800 border border-emerald-200/60";

  const colors = [
    "bg-teal-50 text-teal-800 border border-teal-200/60",
    "bg-orange-50 text-orange-800 border border-orange-200/60",
    "bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200/60",
    "bg-cyan-50 text-cyan-800 border border-cyan-200/60"
  ];
  let hash = 0;
  for (let i = 0; i < nombre.length; i++) {
    hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

/** SMARTPHONE CARD VIEW (Adaptive Mobile View < md) */
function NovedadMobileCard({
  novedad,
  onCompletar,
  onVerActualizaciones
}: {
  novedad: Novedad;
  onCompletar: (n: Novedad) => void;
  onVerActualizaciones: (n: Novedad) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isPendiente = novedad.estado === "PENDIENTE";
  const desc = novedad.descripcion?.trim() ?? "";
  const isLongDesc = desc.length > 110;

  return (
    <article
      className={`rounded-2xl border transition-all duration-200 shadow-sm p-4 space-y-3.5 ${
        isPendiente
          ? "border-amber-200/90 bg-gradient-to-b from-amber-50/30 via-white to-white shadow-amber-100/40 ring-1 ring-amber-400/20"
          : "border-slate-200 bg-white opacity-90"
      }`}
    >
      {/* Card Header: Category & Status */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${getCategoriaBadgeClass(
            novedad.categoria?.nombre
          )}`}
        >
          {formatCategoriaNombre(novedad.categoria?.nombre)}
        </span>

        {isPendiente ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/80 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-900 border border-amber-300/60 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-ping" />
            Pendiente
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800 border border-emerald-200/60">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" aria-hidden="true" />
            Completado
          </span>
        )}
      </div>

      {/* Card Title & Description */}
      <div className="space-y-1.5">
        <h3 className="text-base font-extrabold leading-snug text-slate-900">
          {novedad.titulo}
        </h3>

        {desc && (
          <div className="text-xs leading-relaxed text-slate-600">
            <p className={!isExpanded && isLongDesc ? "line-clamp-2" : "whitespace-pre-wrap"}>
              {desc}
            </p>
            {isLongDesc && (
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="mt-1 flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
              >
                {isExpanded ? (
                  <>
                    <span>Ver menos</span>
                    <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    <span>Ver más...</span>
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Closing notes if completed */}
        {novedad.notasCierre && !isPendiente && (
          <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200/60 p-2.5 text-xs text-slate-600">
            <span className="font-bold text-slate-700 block text-[10px] uppercase tracking-wider mb-0.5">
              Notas de Cierre:
            </span>
            <p className="italic">{novedad.notasCierre}</p>
          </div>
        )}
      </div>

      {/* Reference & Location Badges */}
      {(novedad.expedienteNumero || novedad.consultorioBox) && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {novedad.expedienteNumero && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50/70 border border-indigo-100 px-2.5 py-1 text-xs text-indigo-900 font-medium">
              <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span>
                <strong>Exp:</strong> {novedad.expedienteNumero}
                {novedad.expedienteFecha && ` (${formatDateEsAr(novedad.expedienteFecha)})`}
              </span>
            </div>
          )}
          {novedad.consultorioBox && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50/70 border border-amber-100 px-2.5 py-1 text-xs text-amber-900 font-medium">
              <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>
                <strong>Box:</strong> {novedad.consultorioBox}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Meta Footer: Creator & Timestamp */}
      <div className="border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <User className="h-3 w-3 text-slate-400 shrink-0" />
            <span className="truncate">
              Por: <strong className="text-slate-700">{novedad.creadoPor.nombre}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 shrink-0 font-medium">
            <Calendar className="h-3 w-3" />
            <span>{formatDateTimeEsAr(novedad.fechaCreacion)}</span>
          </div>
        </div>

        {!isPendiente && novedad.completadoPor && (
          <div className="flex items-center justify-between gap-2 text-emerald-700 pt-0.5">
            <span className="truncate">
              Resuelto por: <strong>{novedad.completadoPor.nombre}</strong>
            </span>
            {novedad.fechaCompletado && (
              <span className="text-[10px] text-emerald-600 shrink-0">
                {formatDateTimeEsAr(novedad.fechaCompletado)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons for Mobile */}
      <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onVerActualizaciones(novedad)}
          className="flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3.5 py-2.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 hover:text-indigo-800 active:scale-[0.98]"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Historial / Seguimiento</span>
        </button>

        {isPendiente && (
          <button
            type="button"
            onClick={() => onCompletar(novedad)}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-sm shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-[0.98]"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Marcar Completado</span>
          </button>
        )}
      </div>
    </article>
  );
}

/** DESKTOP TABLE ROW (Desktop View >= md) */
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
    <tr className={isPendiente ? "bg-amber-50/30 hover:bg-amber-50/50" : "opacity-90 hover:bg-slate-50/60"}>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-slate-900">{novedad.titulo}</span>
          {novedad.descripcion && (
            <span className="text-xs text-slate-600 line-clamp-2">{novedad.descripcion}</span>
          )}
          <button
            type="button"
            onClick={() => onVerActualizaciones(novedad)}
            className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100/60 px-2.5 py-1 rounded-lg w-max transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            Historial / Actualizaciones
          </button>
          {novedad.notasCierre && !isPendiente && (
            <span className="text-xs italic text-slate-500 mt-0.5">
              Cierre: {novedad.notasCierre}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${getCategoriaBadgeClass(
            novedad.categoria?.nombre
          )}`}
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
          <p className="mt-0.5">
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
          <p className="mt-1 font-medium text-emerald-700">
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
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 active:scale-[0.98]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Marcar Completado
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
      ? "bg-amber-50/90 text-amber-900 border-amber-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <tr>
      <td colSpan={6} className={`border-y px-4 py-2.5 ${styles}`}>
        <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide">
          {variant === "pendiente" ? (
            <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          )}
          <span>{title}</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] shadow-xs">{count}</span>
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
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-slate-200 border-t-indigo-600" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cargando novedades...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="card py-16 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
          <FileText className="h-6 w-6" />
        </div>
        <p className="text-sm font-bold text-slate-700">No hay novedades para mostrar.</p>
        <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
          Registrá una nueva novedad desde el botón superior o ajustá los filtros de búsqueda.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* 1. SMARTPHONE / MOBILE ADAPTIVE CARD VIEW (< md) */}
      <div className="space-y-6 md:hidden">
        {pendientes.length > 0 && (
          <section className="space-y-3" aria-labelledby="mobile-pendientes-title">
            <div className="flex items-center justify-between rounded-xl bg-amber-50/80 border border-amber-200/80 px-3.5 py-2">
              <h2 id="mobile-pendientes-title" className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-amber-900">
                <Clock className="h-4 w-4 text-amber-600" />
                Pendientes de Acción
              </h2>
              <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                {pendientes.length}
              </span>
            </div>

            <div className="space-y-3">
              {pendientes.map((novedad) => (
                <NovedadMobileCard
                  key={novedad.id}
                  novedad={novedad}
                  onCompletar={onCompletar}
                  onVerActualizaciones={onVerActualizaciones}
                />
              ))}
            </div>
          </section>
        )}

        {completados.length > 0 && (
          <section className="space-y-3" aria-labelledby="mobile-completados-title">
            <div className="flex items-center justify-between rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2">
              <h2 id="mobile-completados-title" className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Completadas / Vistas
              </h2>
              <span className="rounded-full bg-slate-600 px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
                {completados.length}
              </span>
            </div>

            <div className="space-y-3">
              {completados.map((novedad) => (
                <NovedadMobileCard
                  key={novedad.id}
                  novedad={novedad}
                  onCompletar={onCompletar}
                  onVerActualizaciones={onVerActualizaciones}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 2. DESKTOP / TABLET EXPANDED TABLE VIEW (>= md) */}
      <div className="hidden md:block card overflow-hidden p-0">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
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
                  <SectionHeader title="Pendientes de Acción" count={pendientes.length} variant="pendiente" />
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
    </>
  );
}
