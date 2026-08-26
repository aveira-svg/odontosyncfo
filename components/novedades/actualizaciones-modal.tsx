"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, MessageSquare, Send, Calendar, User } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import type { Novedad, NovedadActualizacion } from "@/types";
import {
  getActualizaciones,
  createActualizacion
} from "@/lib/novedades-service";
import { formatDateTimeEsAr } from "@/lib/novedades-utils";

type ActualizacionesModalProps = {
  novedad: Novedad | null;
  onClose: () => void;
};

export function ActualizacionesModal({ novedad, onClose }: ActualizacionesModalProps) {
  const { user } = useAuth();
  const [actualizaciones, setActualizaciones] = useState<NovedadActualizacion[]>([]);
  const [nota, setNota] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const updatesEndRef = useRef<HTMLDivElement>(null);

  const loadActualizaciones = useCallback(async () => {
    if (!novedad) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await getActualizaciones(novedad.id);
      setActualizaciones(data);
    } catch {
      setErrorMsg("No se pudieron cargar las actualizaciones de esta novedad.");
    } finally {
      setLoading(false);
    }
  }, [novedad]);

  function scrollToBottom() {
    updatesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(() => {
    if (novedad) {
      void loadActualizaciones();
      setNota("");
      setErrorMsg("");
    }
  }, [novedad, loadActualizaciones]);

  useEffect(() => {
    scrollToBottom();
  }, [actualizaciones]);

  if (!novedad) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const currentNovedad = novedad;
    if (!nota.trim() || !user || !currentNovedad) return;

    setSubmitting(true);
    setErrorMsg("");
    try {
      const nuevaAct = await createActualizacion(currentNovedad.id, nota, user);
      setActualizaciones((prev) => [...prev, nuevaAct]);
      setNota("");
    } catch (err) {
      setErrorMsg((err as Error).message || "No se pudo registrar la actualización.");
    } finally {
      setSubmitting(false);
    }
  }

  const isPendiente = novedad.estado === "PENDIENTE";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="actualizaciones-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-[92vh] sm:max-h-[85vh]">
        
        {/* Mobile Pull Handle */}
        <div className="mx-auto h-1 w-12 rounded-full bg-slate-300 mb-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <MessageSquare className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="actualizaciones-title" className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
                Bitácora de Seguimiento
              </h2>
              <p className="text-[10px] font-bold text-slate-400">
                Historial y comentarios operativos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-95"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
          </button>
        </div>

        {/* Novedad Context Header Box */}
        <div className="mb-3 rounded-xl bg-slate-50 border border-slate-200/60 p-3 shrink-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
            Novedad
          </span>
          <p className="text-xs font-bold text-slate-900 mt-0.5">{novedad.titulo}</p>
          {novedad.descripcion && (
            <p className="mt-1 text-[11px] text-slate-600 line-clamp-2">{novedad.descripcion}</p>
          )}
        </div>

        {/* Historial Timeline / Chat Bubbles (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-1 space-y-3 custom-scrollbar min-h-[160px] pb-3">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
            </div>
          ) : actualizaciones.length === 0 ? (
            <div className="text-center py-10 text-slate-400 space-y-1.5">
              <MessageSquare className="h-8 w-8 mx-auto stroke-1 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">No hay comentarios registrados todavía.</p>
              <p className="text-[11px] text-slate-400">
                {isPendiente
                  ? "Escribí el primer mensaje abajo para asentar novedades."
                  : "Esta novedad fue cerrada sin comentarios adicionales."}
              </p>
            </div>
          ) : (
            <div className="space-y-3 pl-2 border-l-2 border-indigo-100 ml-2">
              {actualizaciones.map((act) => {
                return (
                  <div key={act.id} className="relative group pl-1">
                    {/* Timeline bullet */}
                    <div className="absolute -left-[18px] top-2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-indigo-600 ring-4 ring-white" />
                    
                    <div className="flex flex-col bg-slate-50 hover:bg-slate-100/70 rounded-xl p-3 border border-slate-200/60 transition-colors shadow-2xs">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100/80 pb-1.5 mb-1.5">
                        <span className="text-[11px] font-extrabold text-indigo-800 flex items-center gap-1">
                          <User className="h-3 w-3 text-indigo-500" />
                          {act.creadoPor.nombre}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          {formatDateTimeEsAr(act.fechaCreacion)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {act.nota}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={updatesEndRef} />
            </div>
          )}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <p className="mb-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 shrink-0" role="alert">
            {errorMsg}
          </p>
        )}

        {/* Input Form at Bottom */}
        <div className="border-t border-slate-100 pt-3 shrink-0">
          {isPendiente ? (
            <form onSubmit={(e) => void handleSubmit(e)} className="flex items-center gap-2">
              <textarea
                className="input resize-none flex-1 min-h-[44px] max-h-[90px] py-2.5 bg-slate-50/70 text-sm sm:text-xs"
                placeholder="Escribí una actualización..."
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={1}
                required
                disabled={submitting}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button
                type="submit"
                className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 shrink-0 h-11 w-11 p-0 rounded-xl"
                disabled={submitting || !nota.trim()}
                title="Enviar actualización"
                aria-label="Enviar"
              >
                {submitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          ) : (
            <div className="rounded-xl bg-slate-100 border border-slate-200/70 p-2.5 text-center text-xs font-bold text-slate-500">
              🔒 Novedad resuelta. Historial cerrado.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
